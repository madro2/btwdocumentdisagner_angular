/** Contrato de diseño BTW v2.1 (alineado al generador). */

export type ComponentType =
  | 'text'
  | 'image'
  | 'container'
  | 'table'
  | 'link'
  | 'qrCode'
  | 'pageNumber'
  | 'line'
  | 'rectangle';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlignment = 'top' | 'center' | 'bottom';
export type ImageFit = 'contain' | 'cover' | 'fill';
export type DocumentKind = 'pdf' | 'pos';
export type PageSize = 'A4' | 'Letter' | 'POS58' | 'POS80';
export type PageOrientation = 'portrait' | 'landscape';
/** Regla de repetición al paginar. `lastPage` es extensión del editor. */
export type RepeatOn = 'allPages' | 'firstPage' | 'lastPage';
export type BehaviorMode = 'fixed' | 'flow';
export type BorderStyle = 'solid' | 'none' | 'dashed';
export type TableMode = 'fixedRows' | 'record' | 'collection';

export interface PageSizeDefinition {
  label: string;
  kind: DocumentKind;
  widthMm: number;
  heightMm: number;
  marginsMm: PageMargins;
}

export const PAGE_SIZES: Record<PageSize, PageSizeDefinition> = {
  A4: {
    label: 'A4 · 210 × 297 mm',
    kind: 'pdf',
    widthMm: 210,
    heightMm: 297,
    marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
  },
  Letter: {
    label: 'Carta · 216 × 279 mm',
    kind: 'pdf',
    widthMm: 216,
    heightMm: 279,
    marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
  },
  POS58: {
    label: 'Tirilla 58 mm',
    kind: 'pos',
    widthMm: 58,
    heightMm: 200,
    marginsMm: { top: 3, right: 3, bottom: 3, left: 3 },
  },
  POS80: {
    label: 'Tirilla 80 mm',
    kind: 'pos',
    widthMm: 80,
    heightMm: 200,
    marginsMm: { top: 3, right: 3, bottom: 3, left: 3 },
  },
};

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageDefinition {
  size: PageSize;
  orientation: PageOrientation;
  widthMm: number;
  heightMm: number;
  marginsMm: PageMargins;
  background: string;
}

export function createPage(
  size: PageSize,
  orientation: PageOrientation = 'portrait',
  background = '#FFFFFF',
): PageDefinition {
  const preset = PAGE_SIZES[size];
  const effectiveOrientation =
    preset.kind === 'pos' ? 'portrait' : orientation;
  const landscape = effectiveOrientation === 'landscape';

  return {
    size,
    orientation: effectiveOrientation,
    widthMm: landscape ? preset.heightMm : preset.widthMm,
    heightMm: landscape ? preset.widthMm : preset.heightMm,
    marginsMm: { ...preset.marginsMm },
    background,
  };
}

export function documentKindOf(page: PageDefinition): DocumentKind {
  return PAGE_SIZES[page.size].kind;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'mm';
}

export interface BorderStyleDef {
  color?: string;
  widthPt?: number;
  style?: BorderStyle;
  radiusMm?: number;
}

export interface ComponentStyle {
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  underline?: boolean;
  color?: string;
  alignment?: TextAlignment;
  verticalAlignment?: VerticalAlignment;
  lineHeight?: number;
  background?: string;
  padding?: number;
  border?: BorderStyleDef;
  widthPt?: number;
  style?: BorderStyle;
  rowHeightMm?: number;
  header?: {
    bold?: boolean;
    alignment?: TextAlignment;
    background?: string;
  };
}

export interface TableColumn {
  id: string;
  title?: string;
  widthMm?: number;
  value?: string;
  dataPath?: string;
  alignment?: TextAlignment;
  style?: ComponentStyle;
}

export interface TableField {
  column: string;
  value?: string;
  dataPath?: string;
  defaultValue?: string;
}

export interface FixedTableRow {
  label?: string;
  value?: string;
  dataPath?: string;
  dataPaths?: string[];
}

export interface ComponentContent {
  value?: string;
  dataPath?: string;
  dataPaths?: string[];
  defaultValue?: string;
  url?: string;
  source?: 'asset' | 'data' | 'runtime';
  assetId?: string;
  /** Vista previa local en el editor (no forma parte del contrato del generador). */
  previewSrc?: string;
  fit?: ImageFit;
  mode?: TableMode | 'dynamic';
  rows?: FixedTableRow[] | number;
  fields?: TableField[];
  columns?: TableColumn[];
  rowAlias?: string;
  showRecordCount?: boolean;
  recordCountLabel?: string;
  format?: string;
}

export interface ComponentBehavior {
  mode?: BehaviorMode;
  repeatOn?: RepeatOn;
  allowOverflow?: boolean;
  headerHeightMm?: number;
  minRowHeightMm?: number;
  maxRowHeightMm?: number;
  repeatHeader?: boolean;
  allowPageBreak?: boolean;
  keepRowTogether?: boolean;
  growVertically?: boolean;
  moveFollowingComponents?: boolean;
}

export interface DesignComponent {
  id: string;
  type: ComponentType;
  name?: string;
  required?: boolean;
  position: Position;
  rotationDegrees?: number;
  content?: ComponentContent;
  style?: ComponentStyle;
  behavior?: ComponentBehavior;
  columns?: TableColumn[];
  components?: DesignComponent[];
}

export interface DocumentMeta {
  id: string;
  name: string;
  type?: string;
  version?: number;
  description?: string;
}

export interface DesignContract {
  schemaVersion: '2.1';
  document: DocumentMeta;
  dataSource?: Record<string, unknown>;
  page: PageDefinition;
  resources?: Array<Record<string, unknown>>;
  sharedStyles?: Record<string, unknown>;
  components: DesignComponent[];
  renderingRules?: Record<string, unknown>;
  resolvedFields?: Record<string, unknown>;
  /** Metadato del editor para listados locales. */
  updatedAt?: string;
}

/** Alias usados por el editor. */
export type PdfTemplate = DesignContract;
export type PdfElement = DesignComponent;
export type PdfElementType = ComponentType;
export type ElementContent = ComponentContent;
export type ElementStyle = ComponentStyle;
export type PageFormat = PageSize;
export const PAGE_FORMATS = PAGE_SIZES;
export const A4_PORTRAIT = createPage('A4');
