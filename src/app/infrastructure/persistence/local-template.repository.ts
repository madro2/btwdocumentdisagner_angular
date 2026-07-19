import { Injectable } from '@angular/core';
import {
  ComponentContent,
  createPage,
  DesignComponent,
  DesignContract,
  FixedTableRow,
  PageDefinition,
  Position,
} from '../../domain/models/template.model';
import { TemplateRepository } from '../../domain/ports/template.repository';

import { Observable, of } from 'rxjs';

const STORAGE_KEY = 'pdf-designer.templates';
const LEGACY_DRAFT_KEY = 'pdf-designer.template-draft';

@Injectable()
export class LocalTemplateRepository implements TemplateRepository {
  list(): Observable<DesignContract[]> {
    return of(this.read());
  }

  load(id: string): Observable<DesignContract | null> {
    return of(this.read().find((template) => template.document.id === id) ?? null);
  }

  save(template: DesignContract): Observable<void> {
    const templates = this.read();
    const index = templates.findIndex(
      (item) => item.document.id === template.document.id,
    );

    if (index === -1) {
      templates.push(template);
    } else {
      templates[index] = template;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return of(undefined);
  }

  remove(id: string): Observable<void> {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        this.read().filter((template) => template.document.id !== id),
      ),
    );
    return of(undefined);
  }

  private read(): DesignContract[] {
    this.migrateLegacyDraft();

    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(migrate) : [];
    } catch {
      return [];
    }
  }

  private migrateLegacyDraft(): void {
    const value = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!value) return;

    try {
      const draft = migrate(JSON.parse(value));
      const templates = [draft];
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        templates.push(...(JSON.parse(existing) as DesignContract[]).map(migrate));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // Borrador ilegible: se descarta.
    } finally {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    }
  }
}

type LegacyElement = {
  id: string;
  type: DesignComponent['type'];
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  position?: Position;
  required?: boolean;
  style?: DesignComponent['style'] & {
    align?: string;
    borderColor?: string;
    borderWidthPx?: number;
    paddingMm?: number;
  };
  content?: ComponentContent & {
    src?: string;
    columns?: Array<{
      id: string;
      header?: string;
      title?: string;
      dataPath?: string;
    }>;
    rows?: number | FixedTableRow[];
  };
  columns?: DesignComponent['columns'];
  events?: Array<{ type: string; scope?: string }>;
  behavior?: DesignComponent['behavior'];
  children?: LegacyElement[];
  components?: LegacyElement[];
};

type LegacyTemplate = Partial<DesignContract> & {
  id?: string;
  name?: string;
  elements?: LegacyElement[];
  pages?: Array<{ elements: LegacyElement[] }>;
  page?: Partial<PageDefinition> & {
    kind?: string;
    format?: string;
    marginMm?: number;
    size?: string;
  };
};

function migrate(raw: LegacyTemplate): DesignContract {
  const page = migratePage(raw.page);
  const components = (
    (raw.components as LegacyElement[] | undefined) ??
    raw.elements ??
    raw.pages?.[0]?.elements ??
    []
  ).map(migrateComponent);

  return {
    schemaVersion: '2.1',
    document: {
      id: raw.document?.id ?? raw.id ?? crypto.randomUUID(),
      name: raw.document?.name ?? raw.name ?? 'Formato sin título',
      type: raw.document?.type ?? 'document',
      version: raw.document?.version ?? 1,
      description: raw.document?.description,
    },
    dataSource: raw.dataSource,
    page,
    resources: raw.resources ?? [],
    sharedStyles: raw.sharedStyles ?? {},
    components,
    renderingRules: raw.renderingRules,
    resolvedFields: raw.resolvedFields,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function migratePage(page?: LegacyTemplate['page']): PageDefinition {
  if (!page) return createPage('A4');

  const size =
    (page.size as PageDefinition['size'] | undefined) ??
    (page.format as PageDefinition['size'] | undefined) ??
    'A4';
  const base = createPage(
    size in { A4: 1, Letter: 1, POS58: 1, POS80: 1 } ? size : 'A4',
    page.orientation ?? 'portrait',
    page.background ?? '#FFFFFF',
  );

  const margin = page.marginMm;
  return {
    ...base,
    widthMm: page.widthMm ?? base.widthMm,
    heightMm: page.heightMm ?? base.heightMm,
    marginsMm: page.marginsMm ??
      (typeof margin === 'number'
        ? { top: margin, right: margin, bottom: margin, left: margin }
        : base.marginsMm),
    background: page.background ?? base.background,
  };
}

function migrateComponent(raw: LegacyElement): DesignComponent {
  const position: Position = raw.position ?? {
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    width: raw.width ?? 20,
    height: raw.height ?? 10,
    unit: 'mm',
  };

  const style = migrateStyle(raw.style);
  const legacyContent = raw.content ?? {};
  const legacyInlineColumns = legacyContent.columns;
  const content: ComponentContent = { ...legacyContent };
  delete (content as { columns?: unknown; src?: unknown }).columns;
  delete (content as { src?: unknown }).src;

  if (legacyContent.src && !content.previewSrc) {
    content.previewSrc = legacyContent.src;
  }

  const columns =
    raw.columns ??
    legacyInlineColumns?.map(
      (column: {
        id: string;
        header?: string;
        title?: string;
        dataPath?: string;
      }) => ({
        id: column.id,
        title: column.title ?? column.header ?? column.id,
        dataPath: column.dataPath,
        widthMm: 30,
      }),
    );

  const repeatOn = migrateRepeatOn(raw);
  const children = (
    (raw.components as LegacyElement[] | undefined) ??
    raw.children ??
    []
  ).map(migrateComponent);

  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    required: raw.required,
    position,
    style,
    content,
    columns,
    behavior: {
      mode: 'fixed',
      ...raw.behavior,
      repeatOn: raw.behavior?.repeatOn ?? repeatOn,
    },
    ...(raw.type === 'container' || children.length
      ? { components: children }
      : {}),
  };
}

function migrateStyle(
  style?: LegacyElement['style'],
): DesignComponent['style'] {
  if (!style) return {};

  const next = { ...style } as DesignComponent['style'] & {
    align?: string;
    borderColor?: string;
    borderWidthPx?: number;
    paddingMm?: number;
  };

  if (next.align && !next.alignment) {
    next.alignment = next.align as NonNullable<DesignComponent['style']>['alignment'];
  }
  delete next.align;

  if (
    !next.border &&
    (next.borderColor || typeof next.borderWidthPx === 'number')
  ) {
    next.border = {
      color: next.borderColor,
      widthPt: next.borderWidthPx ? next.borderWidthPx * 0.75 : undefined,
      style: 'solid',
    };
  }
  delete next.borderColor;
  delete next.borderWidthPx;

  if (typeof next.paddingMm === 'number' && next.padding == null) {
    next.padding = next.paddingMm;
  }
  delete next.paddingMm;

  return next;
}

function migrateRepeatOn(raw: LegacyElement): NonNullable<
  DesignComponent['behavior']
>['repeatOn'] {
  const scope = raw.events?.find((event) => event.type === 'print')?.scope;
  switch (scope) {
    case 'first-page':
      return 'firstPage';
    case 'last-page':
      return 'lastPage';
    default:
      return 'allPages';
  }
}
