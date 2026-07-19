import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, tap } from 'rxjs/operators';
import { createElement, TableSize } from '../../domain/factories/element.factory';
import {
  ComponentContent,
  ComponentStyle,
  ComponentType,
  createPage,
  DesignComponent,
  DesignContract,
  DesignPageEntry,
  DocumentKind,
  documentKindOf,
  PageDefinition,
  PageOrientation,
  PageSize,
  RepeatOn,
} from '../../domain/models/template.model';
import { TEMPLATE_REPOSITORY } from '../tokens/template-repository.token';
import { ContractValidatorService } from '../validation/contract-validator.service';
import { DataSourceFieldBinding, withDataSourceBinding } from './data-source-binding';
import { calculateVersionSaveInfo, VersionSaveInfo } from './versioning';

interface HistorySnapshot {
  template: DesignContract;
  pages: DesignPageEntry[];
  activePageIndex: number;
}

/** Ventana para agrupar mutaciones repetidas (arrastres, tecleo) en un solo paso. */
const HISTORY_COALESCE_MS = 800;
const HISTORY_LIMIT = 100;

@Injectable({ providedIn: 'root' })
export class EditorStore {
  private readonly repository = inject(TEMPLATE_REPOSITORY);
  private readonly validator = inject(ContractValidatorService);
  private readonly http = inject(HttpClient);
  private readonly templateState = signal<DesignContract>(this.emptyTemplate());
  private readonly selectedIdState = signal<string | null>(null);
  private readonly pagesState = signal<DesignPageEntry[]>(
    normalizePages(this.templateState()),
  );
  private readonly activePageIndexState = signal(0);

  private history: HistorySnapshot[] = [];
  private future: HistorySnapshot[] = [];
  private lastHistoryLabel: string | null = null;
  private lastHistoryAt = 0;
  private clipboard: DesignComponent | null = null;

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  readonly template = this.templateState.asReadonly();
  readonly selectedId = this.selectedIdState.asReadonly();
  readonly activePageIndex = this.activePageIndexState.asReadonly();
  /** Páginas del diseño; la activa refleja el estado en edición. */
  readonly pages = computed(() => {
    const activeIndex = this.activePageIndexState();
    const current = this.templateState();
    return this.pagesState().map((entry, index) =>
      index === activeIndex
        ? { ...entry, page: current.page, components: current.components }
        : entry,
    );
  });
  readonly pageCount = computed(() => this.pagesState().length);
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

    const excludedIds = new Set([selected.id, ...collectIds(selected.components ?? [])]);
    return collectContainers(this.templateState().components).filter(
      (container) => !excludedIds.has(container.id),
    );
  });

  createNew(): void {
    this.applyContract(this.emptyTemplate());
  }

  startFromTemplate(template: DesignContract): void {
    this.applyContract({
      ...template,
      document: {
        ...template.document,
        id: crypto.randomUUID(),
      },
      updatedAt: new Date().toISOString(),
    });
  }

  startFromSavedTemplate(name: string, version: number): Observable<boolean> {
    return this.repository.list().pipe(
      map((templates) => {
        const template = templates.find(
          (candidate) =>
            candidate.document.name === name && (candidate.document.version ?? 1) === version,
        );
        if (!template) return false;

        this.startFromTemplate(template);
        return true;
      }),
    );
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

    this.applyContract(contract as DesignContract);
    return null;
  }

  validationErrors(): string[] {
    const contract = this.composeContract();
    const errors = this.validator.validate(contract);
    const seen = new Set(errors);
    (contract.pages ?? []).forEach((entry, index) => {
      if (index === 0) return;
      const pageErrors = this.validator.validate({
        ...contract,
        page: entry.page,
        components: entry.components,
      });
      for (const error of pageErrors) {
        if (seen.has(error)) continue;
        seen.add(error);
        errors.push(`Página ${index + 1}: ${error}`);
      }
    });
    return errors;
  }

  /** Contrato completo con todas las páginas sincronizadas. */
  exportContract(): DesignContract {
    return this.composeContract();
  }

  addPage(): void {
    this.pushHistory();
    this.commitActivePage();
    const current = this.templateState().page;
    const entry: DesignPageEntry = {
      id: crypto.randomUUID(),
      page: { ...current, marginsMm: { ...current.marginsMm } },
      components: [],
    };
    this.pagesState.update((pages) => [...pages, entry]);
    this.setActivePage(this.pagesState().length - 1);
  }

  setActivePage(index: number): void {
    const pages = this.pagesState();
    if (index < 0 || index >= pages.length || index === this.activePageIndexState()) {
      return;
    }

    this.commitActivePage();
    const entry = this.pagesState()[index];
    this.activePageIndexState.set(index);
    this.templateState.update((template) => ({
      ...template,
      page: entry.page,
      components: entry.components,
    }));
    this.selectedIdState.set(null);
  }

  removePage(index: number): void {
    const pages = this.pagesState();
    if (pages.length <= 1 || index < 0 || index >= pages.length) return;

    this.pushHistory();
    this.commitActivePage();
    const remaining = this.pagesState().filter((_, i) => i !== index);
    this.pagesState.set(remaining);

    const active = this.activePageIndexState();
    const nextIndex = Math.min(active > index ? active - 1 : active, remaining.length - 1);
    const entry = remaining[nextIndex];
    this.activePageIndexState.set(nextIndex);
    this.templateState.update((template) => ({
      ...template,
      page: entry.page,
      components: entry.components,
    }));
    this.selectedIdState.set(null);
  }

  /** Copia la página activa (hoja y componentes) dentro de la lista de páginas. */
  private commitActivePage(): void {
    const current = this.templateState();
    const activeIndex = this.activePageIndexState();
    this.pagesState.update((pages) =>
      pages.map((entry, index) =>
        index === activeIndex
          ? { ...entry, page: current.page, components: current.components }
          : entry,
      ),
    );
  }

  /** Contrato con `pages` al día y la raíz apuntando a la primera página. */
  private composeContract(): DesignContract {
    this.commitActivePage();
    const pages = this.pagesState();
    const cleanPages = pages.map((entry) => ({
      ...entry,
      components: this.stripPreviewSrc(entry.components),
    }));

    return {
      ...this.templateState(),
      page: cleanPages[0].page,
      components: cleanPages[0].components,
      pages: cleanPages,
    };
  }

  /** Elimina el previewSrc (Base64) de las imágenes para que el JSON exportado sea ligero. */
  private stripPreviewSrc(components: DesignComponent[] | undefined): DesignComponent[] {
    if (!components) return [];
    return components.map((component) => {
      const copy = { ...component };
      if (copy.content && 'previewSrc' in copy.content) {
        copy.content = { ...copy.content };
        delete copy.content.previewSrc;
      }
      if (copy.components?.length) {
        copy.components = this.stripPreviewSrc(copy.components);
      }
      return copy;
    });
  }

  /** Carga un contrato, inicializando las páginas y activando la primera. */
  private applyContract(contract: DesignContract): void {
    const pages = normalizePages(contract);
    this.pagesState.set(pages);
    this.activePageIndexState.set(0);
    this.templateState.set({
      ...contract,
      page: pages[0].page,
      components: pages[0].components,
    });
    this.selectedIdState.set(null);
    this.clearHistory();
  }

  private currentSnapshot(): HistorySnapshot {
    return {
      template: this.templateState(),
      pages: this.pagesState(),
      activePageIndex: this.activePageIndexState(),
    };
  }

  private restoreSnapshot(snapshot: HistorySnapshot): void {
    this.pagesState.set(snapshot.pages);
    this.activePageIndexState.set(
      clamp(snapshot.activePageIndex, 0, snapshot.pages.length - 1),
    );
    this.templateState.set(snapshot.template);
    this.selectedIdState.set(null);
  }

  /**
   * Guarda el estado previo a una mutación. Con `label`, las repeticiones
   * rápidas de la misma operación (arrastre, tecleo) comparten un solo paso.
   */
  private pushHistory(label?: string): void {
    const now = Date.now();
    if (
      label &&
      label === this.lastHistoryLabel &&
      now - this.lastHistoryAt < HISTORY_COALESCE_MS
    ) {
      this.lastHistoryAt = now;
      this.future = [];
      this.canRedo.set(false);
      return;
    }

    this.history.push(this.currentSnapshot());
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.future = [];
    this.lastHistoryLabel = label ?? null;
    this.lastHistoryAt = now;
    this.canUndo.set(true);
    this.canRedo.set(false);
  }

  private clearHistory(): void {
    this.history = [];
    this.future = [];
    this.lastHistoryLabel = null;
    this.canUndo.set(false);
    this.canRedo.set(false);
  }

  rename(name: string): void {
    this.pushHistory('rename');
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
    this.pushHistory();
    this.updatePage(createPage(size, current.orientation, current.background));
  }

  setOrientation(orientation: PageOrientation): void {
    const page = this.templateState().page;
    if (documentKindOf(page) === 'pos' || page.orientation === orientation) {
      return;
    }
    this.pushHistory();
    this.updatePage(createPage(page.size, orientation, page.background));
  }

  setPageHeight(heightMm: number): void {
    const page = this.templateState().page;
    if (documentKindOf(page) !== 'pos' || !Number.isFinite(heightMm)) return;
    this.pushHistory('page-height');
    this.updatePage({ ...page, heightMm: clamp(heightMm, 30, 3000) });
  }

  setPageBackground(background: string): void {
    this.pushHistory('page-background');
    this.templateState.update((template) => ({
      ...template,
      page: { ...template.page, background },
    }));
  }

  undo(): boolean {
    const snapshot = this.history.pop();
    if (!snapshot) return false;

    this.future.push(this.currentSnapshot());
    this.restoreSnapshot(snapshot);
    this.canUndo.set(this.history.length > 0);
    this.canRedo.set(true);
    this.lastHistoryLabel = null;
    return true;
  }

  redo(): boolean {
    const snapshot = this.future.pop();
    if (!snapshot) return false;

    this.history.push(this.currentSnapshot());
    this.restoreSnapshot(snapshot);
    this.canUndo.set(true);
    this.canRedo.set(this.future.length > 0);
    this.lastHistoryLabel = null;
    return true;
  }

  copySelected(): boolean {
    const selected = this.selectedElement();
    if (!selected) return false;
    this.clipboard = structuredClone(selected);
    return true;
  }

  cutSelected(): boolean {
    if (!this.copySelected()) return false;
    this.removeSelected();
    return true;
  }

  hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  /** Pega el portapapeles en la hoja activa, con ids nuevos y leve desfase. */
  paste(): DesignComponent | null {
    if (!this.clipboard) return null;

    const clone = cloneWithNewIds(structuredClone(this.clipboard));
    const page = this.templateState().page;
    clone.position = {
      ...clone.position,
      x: clamp(clone.position.x + 5, 0, Math.max(0, page.widthMm - clone.position.width)),
      y: clamp(clone.position.y + 5, 0, Math.max(0, page.heightMm - clone.position.height)),
    };
    this.insertElement(clone, undefined, null);
    return clone;
  }

  duplicateSelected(): DesignComponent | null {
    if (!this.copySelected()) return null;
    return this.paste();
  }

  /** Desplaza el elemento seleccionado dentro de los límites de su padre. */
  moveSelectedBy(deltaX: number, deltaY: number): boolean {
    const selected = this.selectedElement();
    if (!selected) return false;

    const bounds = this.getElementBounds(selected.id);
    this.updatePosition(selected.id, {
      x: clamp(
        selected.position.x + deltaX,
        0,
        Math.max(0, bounds.width - selected.position.width),
      ),
      y: clamp(
        selected.position.y + deltaY,
        0,
        Math.max(0, bounds.height - selected.position.height),
      ),
    });
    return true;
  }

  addElement(
    type: ComponentType,
    position?: { x: number; y: number },
    parentId: string | null = null,
    tableSize?: TableSize,
  ): void {
    this.insertElement(createElement(type, tableSize), position, parentId);
  }

  /** Inserta un componente ya construido (por ejemplo un bloque prediseñado). */
  addPrefab(
    element: DesignComponent,
    position?: { x: number; y: number },
    parentId: string | null = null,
  ): void {
    this.insertElement(element, position, parentId);
  }

  addDataSourceField(
    field: DataSourceFieldBinding,
    position?: { x: number; y: number },
    parentId: string | null = null,
  ): void {
    const element = createElement('text');
    element.name = field.displayName || field.name;
    element.content = {
      ...element.content,
      mode: 'dynamic',
      value: `{{${field.path}}}`,
      dataPath: field.path,
      defaultValue: field.displayName || field.name,
    };
    element.properties = {
      ...(element.properties ?? {}),
      dataSourceFieldId: field.id,
      dataSourceCollectionId: field.collectionId,
      dataSourceCollectionName: field.collectionName,
      dataSourceFieldName: field.name,
      dataSourceFieldDescription: field.description,
      dataSourcePath: field.path,
    };
    this.insertElement(element, position, parentId);
  }

  bindDataSourceField(id: string, field: DataSourceFieldBinding): boolean {
    const element = findElement(this.templateState().components, id);
    if (!element) return false;

    const boundElement = withDataSourceBinding(element, field);
    if (!boundElement) return false;

    this.pushHistory();
    this.updateById(id, () => boundElement);
    this.selectedIdState.set(id);
    return true;
  }

  private insertElement(
    element: DesignComponent,
    position: { x: number; y: number } | undefined,
    parentId: string | null,
  ): void {
    this.pushHistory();
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

    element.position = findFreePosition(element.position, this.listChildren(parentId), bounds);

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
    this.pushHistory(`element:${id}`);
    this.updateById(id, (element) => ({ ...element, ...patch }));
  }

  updatePosition(
    id: string,
    patch: Partial<{ x: number; y: number; width: number; height: number }>,
  ): void {
    this.pushHistory(`position:${id}`);
    this.updateById(id, (element) => ({
      ...element,
      position: { ...element.position, ...patch, unit: 'mm' },
    }));
  }

  /**
   * Cambia el tamaño de un elemento. Si es un contenedor, sus hijos se escalan
   * proporcionalmente para que sigan ocupando la misma zona relativa.
   */
  resizeElement(id: string, patch: Partial<{ width: number; height: number }>): void {
    this.pushHistory(`resize:${id}`);
    this.updateById(id, (element) => {
      const width = patch.width ?? element.position.width;
      const height = patch.height ?? element.position.height;
      const scaleX = element.position.width > 0 ? width / element.position.width : 1;
      const scaleY = element.position.height > 0 ? height / element.position.height : 1;

      return {
        ...element,
        position: { ...element.position, width, height, unit: 'mm' },
        components:
          element.type === 'container' && element.components?.length
            ? scaleElements(element.components, scaleX, scaleY)
            : element.components,
      };
    });
  }

  updateStyle(id: string, patch: Partial<ComponentStyle>): void {
    this.pushHistory(`style:${id}`);
    this.updateById(id, (element) => ({
      ...element,
      style: { ...element.style, ...patch },
    }));
  }

  updateContent(id: string, patch: Partial<ComponentContent>): void {
    this.pushHistory(`content:${id}`);
    this.updateById(id, (element) => ({
      ...element,
      content: { ...element.content, ...patch },
    }));
  }

  updateRepeatOn(id: string, repeatOn: RepeatOn): void {
    this.pushHistory(`repeat:${id}`);
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

    const targetPosition = parentId ? findAbsolutePosition(elements, parentId) : { x: 0, y: 0 };
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

    const targetSiblings = (
      parentId ? (findElement(elements, parentId)?.components ?? []) : elements
    ).filter((item) => item.id !== id);
    movedElement.position = findFreePosition(movedElement.position, targetSiblings, bounds);

    this.pushHistory();
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
    return this.getParentBounds(findParentId(this.templateState().components, id));
  }

  /** Componentes que comparten el mismo padre que `id` (excluyéndolo). */
  getSiblings(id: string): DesignComponent[] {
    const components = this.templateState().components;
    const parentId = findParentId(components, id);
    return this.listChildren(parentId).filter((element) => element.id !== id);
  }

  /** Desplazamiento absoluto (en mm de la hoja) del padre de `id`. */
  getParentOffset(id: string): { x: number; y: number } {
    const components = this.templateState().components;
    const parentId = findParentId(components, id);
    if (!parentId) return { x: 0, y: 0 };
    return findAbsolutePosition(components, parentId) ?? { x: 0, y: 0 };
  }

  private listChildren(parentId: string | null): DesignComponent[] {
    if (!parentId) return this.templateState().components;
    return findElement(this.templateState().components, parentId)?.components ?? [];
  }

  removeSelected(): void {
    const id = this.selectedIdState();
    if (!id) return;

    this.pushHistory();
    this.templateState.update((template) => ({
      ...template,
      components: removeElement(template.components, id),
    }));
    this.selectedIdState.set(null);
  }

  save(): Observable<void> {
    const updatedAt = new Date().toISOString();
    this.templateState.update((template) => ({ ...template, updatedAt }));
    return this.repository.save({ ...this.composeContract(), updatedAt });
  }

  versionSaveInfo(): Observable<VersionSaveInfo> {
    const current = this.templateState();
    return this.repository
      .list()
      .pipe(map((templates) => calculateVersionSaveInfo(current, templates)));
  }

  saveAsNewVersion(version: number): Observable<DesignContract> {
    const now = new Date().toISOString();
    const versionedTemplate: DesignContract = {
      ...this.composeContract(),
      document: {
        ...this.templateState().document,
        id: crypto.randomUUID(),
        version,
      },
      updatedAt: now,
    };

    return this.repository.save(versionedTemplate).pipe(
      tap(() => {
        this.applyContract(versionedTemplate);
      }),
      map(() => versionedTemplate),
    );
  }

  loadById(id: string): Observable<boolean> {
    return this.repository.load(id).pipe(
      map((template) => {
        if (!template) return false;
        this.applyContract(template);
        return true;
      }),
    );
  }

  listTemplates(): Observable<DesignContract[]> {
    return this.repository
      .list()
      .pipe(
        map((templates) =>
          templates.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
        ),
      );
  }

  removeTemplate(id: string): Observable<void> {
    return this.repository.remove(id);
  }

  uploadImage(file: File): Observable<{ id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ id: string }>(`${environment.apiBaseUrl}/Images`, formData);
  }

  private updateById(id: string, change: (element: DesignComponent) => DesignComponent): void {
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

/** Clona un componente asignando ids nuevos a él y a todos sus hijos. */
function cloneWithNewIds(element: DesignComponent): DesignComponent {
  return {
    ...element,
    id: crypto.randomUUID(),
    components: element.components?.map(cloneWithNewIds),
  };
}

/** Convierte un contrato (con o sin `pages`) en la lista de páginas del editor. */
function normalizePages(contract: DesignContract): DesignPageEntry[] {
  if (contract.pages?.length) {
    return contract.pages.map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      name: entry.name,
      page: entry.page,
      components: entry.components ?? [],
    }));
  }

  return [
    {
      id: crypto.randomUUID(),
      page: contract.page,
      components: contract.components ?? [],
    },
  ];
}

/** Margen de tolerancia: los bordes pueden tocarse, pero no solaparse. */
const OVERLAP_EPS_MM = 0.2;

export function rectsOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  other: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    x < other.x + other.width - OVERLAP_EPS_MM &&
    x + width > other.x + OVERLAP_EPS_MM &&
    y < other.y + other.height - OVERLAP_EPS_MM &&
    y + height > other.y + OVERLAP_EPS_MM
  );
}

/** Busca la posición libre más cercana: primero hacia abajo, luego en cuadrícula. */
function findFreePosition(
  position: DesignComponent['position'],
  siblings: DesignComponent[],
  bounds: { width: number; height: number },
): DesignComponent['position'] {
  const occupied = (x: number, y: number) =>
    siblings.some((sibling) =>
      rectsOverlap(x, y, position.width, position.height, sibling.position),
    );

  if (!occupied(position.x, position.y)) return position;

  const step = 2;
  for (let y = position.y; y + position.height <= bounds.height; y += step) {
    if (!occupied(position.x, y)) return { ...position, y };
  }
  for (let y = 0; y + position.height <= bounds.height; y += step) {
    for (let x = 0; x + position.width <= bounds.width; x += step) {
      if (!occupied(x, y)) return { ...position, x, y };
    }
  }
  return position;
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

function findElement(elements: DesignComponent[], id: string): DesignComponent | null {
  for (const element of elements) {
    if (element.id === id) return element;
    const nested = element.components ? findElement(element.components, id) : null;
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
    const nested = findAbsolutePosition(element.components ?? [], id, position);
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
  return elements.flatMap((element) => [element.id, ...collectIds(element.components ?? [])]);
}

function containsId(elements: DesignComponent[], id: string): boolean {
  return elements.some((element) => element.id === id || containsId(element.components ?? [], id));
}

function scaleElements(
  elements: DesignComponent[],
  scaleX: number,
  scaleY: number,
): DesignComponent[] {
  if (scaleX === 1 && scaleY === 1) return elements;
  const round = (value: number) => Math.round(value * 100) / 100;
  return elements.map((element) => ({
    ...element,
    position: {
      ...element.position,
      x: round(element.position.x * scaleX),
      y: round(element.position.y * scaleY),
      width: round(element.position.width * scaleX),
      height: round(element.position.height * scaleY),
    },
    components: element.components?.length
      ? scaleElements(element.components, scaleX, scaleY)
      : element.components,
  }));
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

function removeElement(elements: DesignComponent[], id: string): DesignComponent[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) =>
      element.components
        ? { ...element, components: removeElement(element.components, id) }
        : element,
    );
}
