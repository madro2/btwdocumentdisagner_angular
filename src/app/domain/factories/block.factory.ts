import {
  DesignComponent,
  Position,
  TableColumn,
} from '../models/template.model';
import { createElement } from './element.factory';

/** Diseños genéricos cuyo elemento raíz siempre es un contenedor. */
export type ContainerPresetKind =
  | 'header'
  | 'twoColumns'
  | 'information'
  | 'dataTable'
  | 'notes'
  | 'summary'
  | 'highlight'
  | 'footer';

export interface ContainerPresetDefinition {
  kind: ContainerPresetKind;
  label: string;
  hint: string;
  icon: string;
}

export const CONTAINER_PRESETS: ContainerPresetDefinition[] = [
  { kind: 'header', label: 'Encabezado', hint: 'Imagen, título y referencia', icon: '▤' },
  { kind: 'twoColumns', label: 'Dos columnas', hint: 'Información lado a lado', icon: '▥' },
  { kind: 'information', label: 'Sección informativa', hint: 'Título y contenido', icon: '☰' },
  { kind: 'dataTable', label: 'Sección con tabla', hint: 'Título y datos tabulares', icon: '▦' },
  { kind: 'notes', label: 'Notas', hint: 'Área amplia de texto', icon: '❝' },
  { kind: 'summary', label: 'Resumen', hint: 'Etiquetas y valores', icon: 'Σ' },
  { kind: 'highlight', label: 'Dato destacado', hint: 'Valor principal resaltado', icon: 'Aa' },
  { kind: 'footer', label: 'Pie de página', hint: 'Texto legal y paginación', icon: '▬' },
];

const BRAND = '#8b0020';
const TEXT = '#1f2937';
const MUTED = '#64748b';
const BORDER = '#cbd5e1';

export function createContainerPreset(
  kind: ContainerPresetKind,
): DesignComponent {
  switch (kind) {
    case 'header':
      return headerContainer();
    case 'twoColumns':
      return twoColumnsContainer();
    case 'information':
      return informationContainer();
    case 'dataTable':
      return dataTableContainer();
    case 'notes':
      return notesContainer();
    case 'summary':
      return summaryContainer();
    case 'highlight':
      return highlightContainer();
    case 'footer':
      return footerContainer();
  }
}

function headerContainer(): DesignComponent {
  return section('Encabezado', position(7, 7, 196, 36), [
    image('Imagen', position(3, 6, 32, 24), 'Encabezado.Imagen'),
    text(
      'Título y descripción',
      position(39, 10, 91, 18),
      '{{Encabezado.Titulo}}\n{{Encabezado.Descripcion}}\n{{Encabezado.InformacionAdicional}}',
      { bold: true, fontSizePt: 9 },
    ),
    text(
      'Tipo de documento',
      position(134, 11, 58, 7),
      '{{Documento.Tipo}}',
      { bold: true, fontSizePt: 11, alignment: 'center', color: BRAND },
    ),
    text(
      'Referencia',
      position(134, 20, 58, 7),
      '{{Documento.Referencia}}',
      { bold: true, fontSizePt: 11, alignment: 'center', background: '#fff5f7' },
    ),
  ]);
}

function twoColumnsContainer(): DesignComponent {
  return section('Dos columnas', position(7, 7, 196, 43), [
    text(
      'Columna izquierda',
      position(3, 3, 106, 36),
      'TÍTULO DE LA SECCIÓN\n{{Seccion.ColumnaIzquierda}}',
      { fontSizePt: 8.5 },
    ),
    text(
      'Columna derecha',
      position(113, 3, 80, 36),
      'TÍTULO DE LA SECCIÓN\n{{Seccion.ColumnaDerecha}}',
      { fontSizePt: 8.5 },
    ),
  ]);
}

function informationContainer(): DesignComponent {
  return section('Sección informativa', position(7, 7, 196, 24), [
    text(
      'Título',
      position(3, 3, 190, 7),
      '{{Seccion.Titulo}}',
      { bold: true, fontSizePt: 9, color: BRAND },
    ),
    text('Contenido', position(3, 12, 190, 8), '{{Seccion.Contenido}}', {
      fontSizePt: 8,
    }),
  ]);
}

function dataTableContainer(): DesignComponent {
  return section('Sección con tabla', position(7, 7, 196, 60), [
    text('Título', position(3, 3, 190, 7), '{{Seccion.Titulo}}', {
      bold: true,
      fontSizePt: 9,
      color: BRAND,
    }),
    table('Datos', position(3, 12, 190, 45)),
  ]);
}

function notesContainer(): DesignComponent {
  return section('Notas', position(7, 7, 129, 39), [
    text(
      'Contenido',
      position(3, 3, 123, 32),
      'NOTAS\n{{Seccion.Notas}}',
      { fontSizePt: 8.5 },
    ),
  ]);
}

function summaryContainer(): DesignComponent {
  const tableElement = createElement('table', { columns: 2, rows: 4 });

  return section('Resumen', position(7, 7, 64, 30), [
    {
      ...tableElement,
      name: 'Etiquetas y valores',
      position: position(2, 2, 60, 26),
      content: {
        mode: 'fixedRows',
        rows: [
          { label: 'CONCEPTO 1', dataPath: 'Resumen.Valor1' },
          { label: 'CONCEPTO 2', dataPath: 'Resumen.Valor2' },
          { label: 'CONCEPTO 3', dataPath: 'Resumen.Valor3' },
          { label: 'TOTAL', dataPath: 'Resumen.Total' },
        ],
      },
      columns: [
        { id: 'concept', widthMm: 32, alignment: 'left', style: { bold: true } },
        { id: 'amount', widthMm: 26, alignment: 'right', style: { bold: true } },
      ],
      style: {
        ...tableElement.style,
        fontFamily: 'Arial',
        fontSizePt: 8,
        color: TEXT,
        rowHeightMm: 5.5,
        border: { color: 'transparent', widthPt: 0, style: 'none' },
      },
    },
  ]);
}

function highlightContainer(): DesignComponent {
  return section('Dato destacado', position(7, 7, 196, 16), [
    text(
      'Contenido destacado',
      position(3, 3, 190, 10),
      '{{Seccion.Etiqueta}}: {{Seccion.ValorDestacado}}',
      { bold: true, fontSizePt: 8.5 },
    ),
  ]);
}

function table(name: string, tablePosition: Position): DesignComponent {
  const tableElement = createElement('table', { columns: 4, rows: 4 });

  return {
    ...tableElement,
    name,
    position: tablePosition,
    content: {
      ...tableElement.content,
      mode: 'collection',
      dataPath: 'Datos',
      rowAlias: 'Fila',
      rows: 4,
    },
    columns: [
      column('column1', 'Columna 1', 45, 'Columna1'),
      column('column2', 'Columna 2', 70, 'Columna2'),
      column('column3', 'Columna 3', 40, 'Columna3'),
      column('column4', 'Columna 4', 35, 'Columna4', 'right'),
    ],
    style: {
      ...tableElement.style,
      fontFamily: 'Arial',
      fontSizePt: 8,
      color: TEXT,
      rowHeightMm: 9,
      border: { color: BORDER, widthPt: 0.5, style: 'solid' },
      header: { bold: true, alignment: 'center', background: '#fce8ec' },
    },
    behavior: {
      ...tableElement.behavior,
      mode: 'flow',
      repeatOn: 'allPages',
      repeatHeader: true,
      allowPageBreak: true,
      keepRowTogether: true,
      growVertically: true,
      moveFollowingComponents: true,
    },
  };
}

function footerContainer(): DesignComponent {
  return section('Pie de página', position(7, 7, 196, 9), [
    text(
      'Texto del pie',
      position(3, 2, 160, 5),
      '{{Documento.PieDePagina}}',
      { fontSizePt: 6.5, color: MUTED, alignment: 'center' },
    ),
    text(
      'Página',
      position(166, 2, 27, 5),
      'Pág. {{Pagina.Actual}} de {{Pagina.Total}}',
      { fontSizePt: 6.5, color: MUTED, alignment: 'right' },
    ),
  ]);
}

/* ─── Constructores de bajo nivel compartidos ─── */

export function section(
  name: string,
  sectionPosition: Position,
  components: DesignComponent[],
): DesignComponent {
  return {
    id: crypto.randomUUID(),
    type: 'container',
    name,
    position: sectionPosition,
    style: {
      background: '#ffffff',
      padding: 0,
      border: { color: BORDER, widthPt: 0.6, style: 'solid', radiusMm: 1 },
    },
    behavior: { mode: 'fixed', repeatOn: 'allPages' },
    components,
  };
}

export function text(
  name: string,
  textPosition: Position,
  value: string,
  style: Partial<NonNullable<DesignComponent['style']>> = {},
): DesignComponent {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    name,
    position: textPosition,
    content: { value },
    style: {
      fontFamily: 'Arial',
      fontSizePt: 9,
      color: TEXT,
      alignment: 'left',
      lineHeight: 1.15,
      ...style,
    },
    behavior: { mode: 'fixed', repeatOn: 'allPages' },
  };
}

export function image(
  name: string,
  imagePosition: Position,
  dataPath: string,
): DesignComponent {
  return {
    id: crypto.randomUUID(),
    type: 'image',
    name,
    position: imagePosition,
    content: { source: 'data', dataPath, fit: 'contain' },
    style: { background: '#f8fafc' },
    behavior: { mode: 'fixed', repeatOn: 'allPages' },
  };
}

export function column(
  id: string,
  title: string,
  widthMm: number,
  dataPath: string,
  alignment: TableColumn['alignment'] = 'left',
): TableColumn {
  return { id, title, widthMm, dataPath, alignment };
}

export function position(
  x: number,
  y: number,
  width: number,
  height: number,
): Position {
  return { x, y, width, height, unit: 'mm' };
}

/** Reubica un bloque en coordenadas absolutas de la hoja. */
export function placeAt(
  block: DesignComponent,
  x: number,
  y: number,
): DesignComponent {
  return { ...block, position: { ...block.position, x, y } };
}
