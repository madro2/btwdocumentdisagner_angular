import {
  ComponentType,
  DesignComponent,
  TableColumn,
} from '../models/template.model';

export interface TableSize {
  columns: number;
  rows: number;
}

export function createElement(
  type: ComponentType,
  tableSize?: TableSize,
): DesignComponent {
  const base: DesignComponent = {
    id: crypto.randomUUID(),
    type,
    name: '',
    position: { x: 20, y: 20, width: 60, height: 12, unit: 'mm' },
    style: {},
    content: {},
    behavior: { mode: 'fixed', repeatOn: 'allPages' },
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        name: 'Texto',
        content: { value: 'Texto de ejemplo' },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 10,
          color: '#111111',
          alignment: 'left',
        },
      };
    case 'image':
      return {
        ...base,
        name: 'Imagen',
        position: { ...base.position, width: 45, height: 28 },
        content: { source: 'asset', fit: 'contain' },
      };
    case 'container':
      return {
        ...base,
        name: 'Contenedor',
        position: { ...base.position, width: 100, height: 50 },
        style: {
          background: '#FFFFFF',
          padding: 2,
          border: {
            color: '#94a3b8',
            widthPt: 0.8,
            style: 'solid',
          },
        },
        components: [],
      };
    case 'table': {
      const columnCount = tableSize?.columns ?? 2;
      const rows = tableSize?.rows ?? 2;
      const tableWidth = Math.max(60, Math.min(30 * columnCount, 190));
      const columns: TableColumn[] = Array.from(
        { length: columnCount },
        (_, index) => ({
          id: `col-${index + 1}`,
          title: `Columna ${index + 1}`,
          widthMm: tableWidth / columnCount,
          dataPath: '',
        }),
      );

      return {
        ...base,
        name: `Tabla ${columnCount} × ${rows}`,
        position: {
          ...base.position,
          width: tableWidth,
          height: Math.max(20, 8 * (rows + 1)),
        },
        content: {
          mode: 'collection',
          dataPath: '',
          rows,
        },
        columns,
        style: {
          fontFamily: 'Arial',
          fontSizePt: 9,
          color: '#111111',
          border: {
            color: '#94a3b8',
            widthPt: 0.5,
            style: 'solid',
          },
        },
      };
    }
    case 'link':
      return {
        ...base,
        name: 'Vínculo',
        position: { ...base.position, width: 50, height: 8 },
        content: { value: 'Ir al enlace', url: 'https://' },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 10,
          color: '#1d4ed8',
          alignment: 'left',
          underline: true,
        },
      };
    case 'qrCode':
      return {
        ...base,
        name: 'Código QR',
        position: { ...base.position, width: 28, height: 28 },
        content: { mode: 'dynamic', dataPath: '' },
      };
    case 'pageNumber':
      return {
        ...base,
        name: 'Número de página',
        position: { ...base.position, width: 40, height: 6 },
        content: {
          format: 'Página: {{Pagina.Actual}} de {{Pagina.Total}}',
        },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 8,
          alignment: 'right',
        },
      };
    case 'line':
      return {
        ...base,
        name: 'Línea',
        position: { ...base.position, width: 80, height: 1 },
        style: {
          color: '#555555',
          widthPt: 0.5,
          style: 'solid',
        },
      };
    case 'rectangle':
      return {
        ...base,
        name: 'Rectángulo',
        position: { ...base.position, width: 60, height: 30 },
        style: {
          background: '#FFFFFF',
          border: {
            color: '#222222',
            widthPt: 0.8,
            style: 'solid',
            radiusMm: 1.5,
          },
        },
      };
    case 'barcode':
      return {
        ...base,
        name: 'Código de barras',
        position: { ...base.position, width: 60, height: 18 },
        content: { mode: 'dynamic', dataPath: '' },
        properties: { format: 'CODE128' },
      };
    case 'pageBreak':
      return {
        ...base,
        name: 'Salto de página',
        position: { ...base.position, width: 1, height: 1 },
        behavior: { mode: 'flow' },
      };
  }
}
