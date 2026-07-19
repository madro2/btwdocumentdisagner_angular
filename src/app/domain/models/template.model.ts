/** Contrato de diseño BTW. La versión canónica actual es 3.0. */

export type ComponentType =
  | 'text'
  | 'image'
  | 'container'
  | 'table'
  | 'link'
  | 'qrCode'
  | 'pageNumber'
  | 'line'
  | 'rectangle'
  | 'barcode'
  | 'pageBreak';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlignment = 'top' | 'center' | 'bottom';
export type ImageFit = 'contain' | 'cover' | 'fill';
export type DocumentKind = 'pdf' | 'pos';
export type PageSize = 'A4' | 'LETTER' | 'LEGAL' | 'CUSTOM' | 'POS58' | 'POS80';
export type PageOrientation = 'portrait' | 'landscape';
/** Regla de repetición al paginar. `lastPage` es extensión del editor. */
export type RepeatOn = 'allPages' | 'firstPage' | 'lastPage';
export type BehaviorMode = 'fixed' | 'responsive' | 'flow';
export type BorderStyle = 'solid' | 'none' | 'dashed' | 'dotted';
export type TableMode = 'fixed' | 'dynamic' | 'fixedRows' | 'record' | 'collection';

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
  LETTER: {
    label: 'Carta · 216 × 279 mm',
    kind: 'pdf',
    widthMm: 215.9,
    heightMm: 279.4,
    marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
  },
  LEGAL: {
    label: 'Legal · 216 × 356 mm',
    kind: 'pdf',
    widthMm: 215.9,
    heightMm: 355.6,
    marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
  },
  CUSTOM: {
    label: 'Personalizado',
    kind: 'pdf',
    widthMm: 210,
    heightMm: 297,
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
  italic?: boolean;
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
  fit?: 'none' | 'shrinkToFit';
  headerBold?: boolean;
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
  dataPaths?: string[];
  defaultValue?: string;
  fallback?: { dataPath?: string; defaultValue?: string };
  visibilityCondition?: string;
  alignment?: TextAlignment;
  style?: ComponentStyle;
}

export interface TableField {
  column: string;
  value?: string;
  dataPath?: string;
  defaultValue?: string;
  dataPaths?: string[];
}

export interface FixedTableRow {
  label?: string;
  value?: string;
  dataPath?: string;
  dataPaths?: string[];
  defaultValue?: string;
  collectionPath?: string;
  visibilityCondition?: string;
}

export interface ContentSelector {
  type?: 'directChildElements' | 'siblingElements' | 'path';
  parentPath?: string;
  elementName?: string;
  path?: string;
}

export interface BindingOperand {
  kind: 'path' | 'literal';
  path?: string;
  value?: unknown;
}

export interface BindingDefinition {
  source?: 'path' | 'function' | 'lookup' | 'runtime';
  dataPath?: string;
  function?: string;
  arguments?: BindingOperand[];
  defaultValue?: unknown;
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
  mode?: TableMode;
  rows?: FixedTableRow[] | number;
  optionalRows?: FixedTableRow[];
  fields?: TableField[];
  columns?: TableColumn[];
  collectionPath?: string;
  rowAlias?: string;
  selector?: ContentSelector;
  bindings?: Record<string, BindingDefinition>;
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
  generateRuntimeComponents?: boolean;
  persistRuntimeComponents?: boolean;
  reservedBottomSpaceMm?: number;
  placement?: 'normal' | 'pageHeader' | 'pageFooter';
  reserveSpace?: boolean;
}

export interface ComponentAnchor {
  mode: 'absolute' | 'after' | 'before' | 'footer';
  componentId?: string;
  spacingMm?: number;
}

export interface DesignComponent {
  id: string;
  type: ComponentType;
  name?: string;
  required?: boolean;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
  styleRef?: string;
  position: Position;
  rotationDegrees?: number;
  content?: ComponentContent;
  style?: ComponentStyle;
  behavior?: ComponentBehavior;
  anchor?: ComponentAnchor;
  properties?: Record<string, unknown>;
  rowTemplate?: Record<string, unknown>;
  optionalColumns?: TableColumn[];
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

export interface RuntimeParameterDefinition {
  name: string;
  type: 'string' | 'integer' | 'number' | 'datetime' | 'boolean' | 'image';
  required?: boolean;
  defaultValue?: unknown;
}

export interface DataTableDefinition {
  name: string;
  cardinality: 'one' | 'zeroOrOne' | 'oneOrMany' | 'zeroOrMany';
  dataPath: string;
  selector?: ContentSelector;
}

export interface ComputedFieldDefinition {
  name: string;
  type: string;
  resolver: Record<string, unknown>;
}

export interface DataSourceDefinition {
  type: 'xml' | 'json';
  rootPath?: string;
  pathDialect?: 'dotPath' | 'xpath' | 'jsonPath';
  selectionMode?: string;
  allowMissingFields?: boolean;
  runtimeParameters?: RuntimeParameterDefinition[];
  tables?: DataTableDefinition[];
  lookups?: Record<string, Record<string, string>>;
  computedFields?: ComputedFieldDefinition[];
  bindingLanguage?: Record<string, unknown>;
  encodingPolicy?: Record<string, unknown>;
}

export interface ContractValidation {
  status?: 'draft' | 'proposed' | 'validated' | 'rejected';
  pendingBindings?: Array<{
    id: string;
    dataPath?: string;
    status: 'pendingValidation' | 'validated' | 'rejected';
  }>;
  validatedAgainst?: Array<Record<string, unknown>>;
  knownInputIssues?: Array<Record<string, unknown>>;
}

export interface DesignContract {
  schemaVersion: '2.1' | '2.2' | '3.0';
  document: DocumentMeta;
  dataSource?: DataSourceDefinition;
  page: PageDefinition;
  resources?: Array<Record<string, unknown>>;
  sharedStyles?: Record<string, unknown>;
  components: DesignComponent[];
  renderingRules?: Record<string, unknown>;
  resolvedFields?: Record<string, unknown>;
  validation?: ContractValidation;
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
