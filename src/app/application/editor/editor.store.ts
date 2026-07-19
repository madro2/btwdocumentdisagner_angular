import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createElement, TableSize } from '../../domain/factories/element.factory';
import {
  ComponentContent,
  ComponentStyle,
  ComponentType,
  createPage,
  DesignComponent,
  DesignContract,
  DocumentKind,
  documentKindOf,
  PageDefinition,
  PageOrientation,
  PageSize,
  RepeatOn,
} from '../../domain/models/template.model';
import { TEMPLATE_REPOSITORY } from '../tokens/template-repository.token';
import { ContractValidatorService } from '../validation/contract-validator.service';

@Injectable({ providedIn: 'root' })
export class EditorStore {
  private readonly repository = inject(TEMPLATE_REPOSITORY);
  private readonly validator = inject(ContractValidatorService);
  private readonly templateState = signal<DesignContract>(this.emptyTemplate());
  private readonly selectedIdState = signal<string | null>(null);

  readonly template = this.templateState.asReadonly();
  readonly selectedId = this.selectedIdState.asReadonly();
  readonly selectedElement = computed(() => {
    const id = this.selectedIdState();
    return id ? findElement(this.templateState().components, id) : null;
  });
  readonly selectedParentId = computed(() => {
    const id = this.selectedIdState();
    return id ? findParentId(this.templateState().components, id) : null;
  });
  readonly availableParents = computed(() => {
    const selected = this.selectedElement();
    if (!selected) return [];

    const excludedIds = new Set([
      selected.id,
      ...collectIds(selected.components ?? []),
    ]);
    return collectContainers(this.templateState().components).filter(
      (container) => !excludedIds.has(container.id),
    );
  });

  createNew(): void {
    this.templateState.set(this.emptyTemplate());
    this.selectedIdState.set(null);
  }

  importContract(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') {
      return 'El archivo no contiene un objeto JSON.';
    }

    const contract = raw as Partial<DesignContract>;
    if (
      !['2.1', '2.2', '3.0'].includes(contract.schemaVersion ?? '') ||
      !contract.document?.id ||
      !contract.page ||
      !Array.isArray(contract.components)
    ) {
      return 'El contrato no contiene schemaVersion, document, page y components válidos.';
    }

    const errors = this.validator.validate(contract as DesignContract);
    if (errors.length) {
      return `Contrato inválido: ${errors.slice(0, 3).join(' ')}`;
    }

    this.templateState.set(contract as DesignContract);
    this.selectedIdState.set(null);
    return null;
  }

  validationErrors(): string[] {
    return this.validator.validate(this.templateState());
  }

  rename(name: string): void {
    this.templateState.update((template) => ({
      ...template,
      document: { ...template.document, name },
    }));
  }

  setDocumentKind(kind: DocumentKind): void {
    if (documentKindOf(this.templateState().page) === kind) return;
    this.setPageFormat(kind === 'pdf' ? 'A4' : 'POS80');
  }

  setPageFormat(size: PageSize): void {
    const current = this.templateState().page;
    this.updatePage(createPage(size, current.orientation, current.background));
  }

  setOrientation(orientation: PageOrientation): void {
    const page = this.templateState().page;
    if (documentKindOf(page) === 'pos' || page.orientation === orientation) {
      return;
    }
    this.updatePage(createPage(page.size, orientation, page.background));
  }

  setPageHeight(heightMm: number): void {
    const page = this.templateState().page;
    if (documentKindOf(page) !== 'pos' || !Number.isFinite(heightMm)) return;
    this.updatePage({ ...page, heightMm: clamp(heightMm, 30, 3000) });
  }

  setPageBackground(background: string): void {
    this.templateState.update((template) => ({
      ...template,
      page: { ...template.page, background },
    }));
  }

  addElement(
    type: ComponentType,
    position?: { x: number; y: number },
    parentId: string | null = null,
    tableSize?: TableSize,
  ): void {
    const element = createElement(type, tableSize);
    const bounds = this.getParentBounds(parentId);
    element.position.width = Math.min(element.position.width, bounds.width);
    element.position.height = Math.min(element.position.height, bounds.height);

    if (position) {
      element.position.x = clamp(
        position.x - element.position.width / 2,
        0,
        bounds.width - element.position.width,
      );
      element.position.y = clamp(
        position.y - element.position.height / 2,
        0,
        bounds.height - element.position.height,
      );
    }

    this.templateState.update((template) => {
      if (!parentId) {
        return {
          ...template,
          components: [...template.components, element],
        };
      }

      return {
        ...template,
        components: mapElements(template.components, parentId, (parent) => ({
          ...parent,
          components: [...(parent.components ?? []), element],
        })),
      };
    });
    this.selectedIdState.set(element.id);
  }

  select(id: string | null): void {
    this.selectedIdState.set(id);
  }

  updateElement(id: string, patch: Partial<DesignComponent>): void {
    this.updateById(id, (element) => ({ ...element, ...patch }));
  }

  updatePosition(
    id: string,
    patch: Partial<{ x: number; y: number; width: number; height: number }>,
  ): void {
    this.updateById(id, (element) => ({
      ...element,
      position: { ...element.position, ...patch, unit: 'mm' },
    }));
  }

  updateStyle(id: string, patch: Partial<ComponentStyle>): void {
    this.updateById(id, (element) => ({
      ...element,
      style: { ...element.style, ...patch },
    }));
  }

  updateContent(id: string, patch: Partial<ComponentContent>): void {
    this.updateById(id, (element) => ({
      ...element,
      content: { ...element.content, ...patch },
    }));
  }

  updateRepeatOn(id: string, repeatOn: RepeatOn): void {
    this.updateById(id, (element) => ({
      ...element,
      behavior: {
        mode: 'fixed',
        ...element.behavior,
        repeatOn,
      },
    }));
  }

  moveToParent(id: string, parentId: string | null): boolean {
    if (id === parentId) return false;

    const elements = this.templateState().components;
    const element = findElement(elements, id);
    if (!element) return false;
    if (parentId && containsId(element.components ?? [], parentId)) return false;

    const currentParentId = findParentId(elements, id);
    if (currentParentId === parentId) return true;

    const absolutePosition = findAbsolutePosition(elements, id);
    if (!absolutePosition) return false;

    const targetPosition = parentId
      ? findAbsolutePosition(elements, parentId)
      : { x: 0, y: 0 };
    if (!targetPosition) return false;

    const bounds = this.getParentBounds(parentId);
    const movedElement: DesignComponent = {
      ...element,
      position: {
        ...element.position,
        x: clamp(
          absolutePosition.x - targetPosition.x,
          0,
          Math.max(0, bounds.width - element.position.width),
        ),
        y: clamp(
          absolutePosition.y - targetPosition.y,
          0,
          Math.max(0, bounds.height - element.position.height),
        ),
      },
    };

    this.templateState.update((template) => {
      const withoutElement = removeElement(template.components, id);
      if (!parentId) {
        return {
          ...template,
          components: [...withoutElement, movedElement],
        };
      }

      return {
        ...template,
        components: mapElements(withoutElement, parentId, (parent) => ({
          ...parent,
          components: [...(parent.components ?? []), movedElement],
        })),
      };
    });
    return true;
  }

  getParentBounds(id: string | null): { width: number; height: number } {
    if (!id) {
      const page = this.templateState().page;
      return { width: page.widthMm, height: page.heightMm };
    }

    const parent = findElement(this.templateState().components, id);
    return parent
      ? { width: parent.position.width, height: parent.position.height }
      : { width: 0, height: 0 };
  }

  getElementBounds(id: string): { width: number; height: number } {
    return this.getParentBounds(
      findParentId(this.templateState().components, id),
    );
  }

  removeSelected(): void {
    const id = this.selectedIdState();
    if (!id) return;

    this.templateState.update((template) => ({
      ...template,
      components: removeElement(template.components, id),
    }));
    this.selectedIdState.set(null);
  }

  save(): Observable<void> {
    this.templateState.update((template) => ({
      ...template,
      updatedAt: new Date().toISOString(),
    }));
    return this.repository.save(this.templateState());
  }

  loadById(id: string): Observable<boolean> {
    return this.repository.load(id).pipe(
      map(template => {
        if (!template) return false;
        this.templateState.set(template);
        this.selectedIdState.set(null);
        return true;
      })
    );
  }

  listTemplates(): Observable<DesignContract[]> {
    return this.repository.list().pipe(
      map(templates => templates.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')))
    );
  }

  removeTemplate(id: string): Observable<void> {
    return this.repository.remove(id);
  }

  private updateById(
    id: string,
    change: (element: DesignComponent) => DesignComponent,
  ): void {
    this.templateState.update((template) => ({
      ...template,
      components: mapElements(template.components, id, change),
    }));
  }

  private updatePage(page: PageDefinition): void {
    this.templateState.update((template) => ({
      ...template,
      page,
      components: fitElements(template.components, page.widthMm, page.heightMm),
    }));
  }

  private emptyTemplate(): DesignContract {
    return {
      schemaVersion: '3.0',
      document: {
        id: crypto.randomUUID(),
        name: 'Formato sin título',
        type: 'document',
        version: 1,
      },
      dataSource: {
        type: 'xml',
        rootPath: '/NewDataSet',
        pathDialect: 'dotPath',
        selectionMode: 'directChildren',
        allowMissingFields: true,
        runtimeParameters: [],
        tables: [],
        lookups: {},
        computedFields: [],
      },
      page: createPage('A4'),
      resources: [],
      sharedStyles: {},
      components: [],
      validation: { status: 'draft', pendingBindings: [] },
      updatedAt: new Date().toISOString(),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fitElements(
  elements: DesignComponent[],
  widthMm: number,
  heightMm: number,
): DesignComponent[] {
  return elements.map((element) => {
    const width = Math.min(element.position.width, widthMm);
    const height = Math.min(element.position.height, heightMm);
    return {
      ...element,
      position: {
        ...element.position,
        width,
        height,
        x: clamp(element.position.x, 0, widthMm - width),
        y: clamp(element.position.y, 0, heightMm - height),
      },
    };
  });
}

function findElement(
  elements: DesignComponent[],
  id: string,
): DesignComponent | null {
  for (const element of elements) {
    if (element.id === id) return element;
    const nested = element.components
      ? findElement(element.components, id)
      : null;
    if (nested) return nested;
  }
  return null;
}

function findParentId(
  elements: DesignComponent[],
  id: string,
  parentId: string | null = null,
): string | null {
  for (const element of elements) {
    if (element.id === id) return parentId;
    const nested = findParentId(element.components ?? [], id, element.id);
    if (nested) return nested;
  }
  return null;
}

function findAbsolutePosition(
  elements: DesignComponent[],
  id: string,
  offset = { x: 0, y: 0 },
): { x: number; y: number } | null {
  for (const element of elements) {
    const position = {
      x: offset.x + element.position.x,
      y: offset.y + element.position.y,
    };
    if (element.id === id) return position;
    const nested = findAbsolutePosition(
      element.components ?? [],
      id,
      position,
    );
    if (nested) return nested;
  }
  return null;
}

function collectContainers(elements: DesignComponent[]): DesignComponent[] {
  return elements.flatMap((element) => [
    ...(element.type === 'container' ? [element] : []),
    ...collectContainers(element.components ?? []),
  ]);
}

function collectIds(elements: DesignComponent[]): string[] {
  return elements.flatMap((element) => [
    element.id,
    ...collectIds(element.components ?? []),
  ]);
}

function containsId(elements: DesignComponent[], id: string): boolean {
  return elements.some(
    (element) =>
      element.id === id || containsId(element.components ?? [], id),
  );
}

function mapElements(
  elements: DesignComponent[],
  id: string,
  change: (element: DesignComponent) => DesignComponent,
): DesignComponent[] {
  return elements.map((element) => {
    if (element.id === id) return change(element);
    if (!element.components) return element;
    return {
      ...element,
      components: mapElements(element.components, id, change),
    };
  });
}

function removeElement(
  elements: DesignComponent[],
  id: string,
): DesignComponent[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) =>
      element.components
        ? { ...element, components: removeElement(element.components, id) }
        : element,
    );
}
