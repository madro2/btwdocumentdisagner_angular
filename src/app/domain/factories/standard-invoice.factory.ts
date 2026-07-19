import {
  createPage,
  DesignComponent,
  DesignContract,
} from '../models/template.model';
import { createElement } from './element.factory';
import {
  column,
  image,
  position,
  section,
  text,
} from './block.factory';

/** Plantilla base de factura electrónica compuesta por bloques prediseñados. */
export function createStandardInvoiceTemplate(): DesignContract {
  return {
    schemaVersion: '3.0',
    document: {
      id: crypto.randomUUID(),
      name: 'Factura electrónica estándar',
      type: 'invoice',
      version: 1,
      description:
        'Plantilla base inspirada en el formato de factura electrónica BTW.',
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
    components: [
      invoiceHeader(),
      customerInformation(),
      dianInformation(),
      invoiceItems(),
      observations(),
      totals(),
      amountInWords(),
      taxDetail(),
      invoiceFooter(),
    ],
    validation: { status: 'draft', pendingBindings: [] },
    updatedAt: new Date().toISOString(),
  };
}

function invoiceHeader(): DesignComponent {
  return section('Encabezado', position(7, 7, 196, 36), [
    image('Logo del emisor', position(3, 6, 32, 24), 'Emisor.Logo'),
    text(
      'Datos del emisor',
      position(39, 9, 91, 20),
      '{{Emisor.RazonSocial}}\nNIT: {{Emisor.Nit}} · TEL: {{Emisor.Telefono}}\n{{Emisor.Direccion}}\n{{Emisor.Correo}}',
      { bold: true, fontSizePt: 9 },
    ),
    text(
      'Título de factura',
      position(134, 9, 58, 11),
      'FACTURA ELECTRÓNICA\nDE VENTA',
      { bold: true, fontSizePt: 11, alignment: 'center', color: '#8b0020' },
    ),
    text(
      'Consecutivo',
      position(134, 21, 58, 7),
      '{{Factura.Prefijo}} {{Factura.Numero}}',
      {
        bold: true,
        fontSizePt: 11,
        alignment: 'center',
        background: '#fff5f7',
      },
    ),
  ]);
}

function customerInformation(): DesignComponent {
  return section('Información principal', position(7, 46, 196, 43), [
    text(
      'Datos del cliente',
      position(3, 3, 106, 36),
      'SEÑORES: {{Cliente.RazonSocial}}\nTIPO DE DOCUMENTO: {{Cliente.TipoDocumento}}\nNIT: {{Cliente.NumeroDocumento}}\nTELÉFONO: {{Cliente.Telefono}}\nDIRECCIÓN: {{Cliente.Direccion}}\nCIUDAD: {{Cliente.Ciudad}} · {{Cliente.Departamento}}\nPAÍS: {{Cliente.Pais}}',
      { fontSizePt: 8.5 },
    ),
    text(
      'Información de factura',
      position(113, 3, 80, 36),
      'INFORMACIÓN FACTURA\nFecha Factura: {{Factura.FechaEmision}}\nFecha Vencimiento: {{Factura.FechaVencimiento}}\nForma de Pago: {{Factura.FormaPago}}\nMedio de Pago: {{Factura.MedioPago}}\nNro. Pedido: {{Factura.NumeroPedido}}\nLínea de negocio: {{Factura.LineaNegocio}}',
      { fontSizePt: 8.5 },
    ),
  ]);
}

function dianInformation(): DesignComponent {
  return section('Información DIAN', position(7, 92, 196, 24), [
    text(
      'Resolución DIAN',
      position(3, 3, 190, 7),
      'Resolución: {{Dian.Resolucion}} · Autorización: {{Dian.FechaAutorizacion}} · Rango: {{Dian.RangoAutorizado}}',
      { fontSizePt: 7.5, color: '#64748b' },
    ),
    text('CUFE', position(3, 12, 190, 8), 'CUFE: {{Dian.Cufe}}', {
      fontSizePt: 7.5,
    }),
  ]);
}

function invoiceItems(): DesignComponent {
  const table = createElement('table', { columns: 8, rows: 4 });

  return section('Detalle de productos y servicios', position(7, 119, 196, 52), [
    {
      ...table,
      name: 'Tabla de productos y servicios',
      position: position(1, 1, 194, 50),
      content: {
        ...table.content,
        mode: 'collection',
        dataPath: 'Items',
        rowAlias: 'Item',
        rows: 4,
      },
      columns: [
        column('line', 'Línea', 10, 'Linea'),
        column('code', 'Código', 18, 'Codigo'),
        column('description', 'Descripción', 68, 'Descripcion'),
        column('quantity', 'Cantidad', 18, 'Cantidad', 'right'),
        column('unit', 'Unidad', 16, 'Unidad'),
        column('unitValue', 'Valor unitario', 25, 'ValorUnitario', 'right'),
        column('tax', '% IVA', 14, 'PorcentajeIva', 'right'),
        column('total', 'Total', 25, 'Total', 'right'),
      ],
      style: {
        ...table.style,
        fontFamily: 'Arial',
        fontSizePt: 7.5,
        color: '#1f2937',
        rowHeightMm: 10,
        border: { color: '#cbd5e1', widthPt: 0.5, style: 'solid' },
        header: { bold: true, alignment: 'center', background: '#fce8ec' },
      },
      behavior: {
        ...table.behavior,
        mode: 'flow',
        repeatOn: 'allPages',
        repeatHeader: true,
        allowPageBreak: true,
        keepRowTogether: true,
        growVertically: true,
        moveFollowingComponents: true,
      },
    },
  ]);
}

function observations(): DesignComponent {
  return section('Observaciones', position(7, 175, 129, 39), [
    text(
      'Texto de observaciones',
      position(3, 3, 123, 32),
      'OBSERVACIONES:\n{{Factura.Observaciones}}',
      { fontSizePt: 8.5 },
    ),
  ]);
}

function totals(): DesignComponent {
  const table = createElement('table', { columns: 2, rows: 6 });

  return section('Totales', position(139, 175, 64, 39), [
    {
      ...table,
      name: 'Resumen de totales',
      position: position(2, 2, 60, 35),
      content: {
        mode: 'fixedRows',
        rows: [
          { label: 'SUBTOTAL', dataPath: 'Totales.Subtotal' },
          { label: 'DESCUENTO', dataPath: 'Totales.Descuento' },
          { label: 'IVA', dataPath: 'Totales.Iva' },
          { label: 'OTROS IMPUESTOS', dataPath: 'Totales.OtrosImpuestos' },
          { label: 'RETENCIONES', dataPath: 'Totales.Retenciones' },
          { label: 'TOTAL {{Factura.Moneda}}', dataPath: 'Totales.Total' },
        ],
      },
      columns: [
        { id: 'concept', widthMm: 32, alignment: 'left', style: { bold: true } },
        { id: 'amount', widthMm: 26, alignment: 'right', style: { bold: true } },
      ],
      style: {
        ...table.style,
        fontFamily: 'Arial',
        fontSizePt: 8,
        color: '#1f2937',
        rowHeightMm: 5.5,
        border: { color: 'transparent', widthPt: 0, style: 'none' },
      },
    },
  ]);
}

function amountInWords(): DesignComponent {
  return section('Valor en letras', position(7, 218, 196, 16), [
    text(
      'Total en letras',
      position(3, 3, 190, 10),
      'VALORES EN LETRAS: {{Totales.ValorEnLetras}}',
      { bold: true, fontSizePt: 8.5 },
    ),
  ]);
}

function taxDetail(): DesignComponent {
  const table = createElement('table', { columns: 5, rows: 1 });

  return section('Detalle de impuestos', position(7, 238, 196, 16), [
    {
      ...table,
      name: 'Tabla de impuestos',
      position: position(1, 1, 194, 14),
      content: {
        ...table.content,
        mode: 'collection',
        dataPath: 'Impuestos',
        rowAlias: 'Impuesto',
        rows: 1,
      },
      columns: [
        column('tax', 'Impuesto', 50, 'Nombre'),
        column('detail', 'Detalle', 42, 'Detalle'),
        column('rate', 'Tarifa', 25, 'Tarifa', 'right'),
        column('base', 'Base', 35, 'Base', 'right'),
        column('amount', 'Total impuesto', 42, 'Total', 'right'),
      ],
      style: {
        ...table.style,
        fontFamily: 'Arial',
        fontSizePt: 7,
        color: '#1f2937',
        rowHeightMm: 6,
        border: { color: '#cbd5e1', widthPt: 0.5, style: 'solid' },
        header: { bold: true, alignment: 'center', background: '#f1f5f9' },
      },
      behavior: {
        ...table.behavior,
        mode: 'fixed',
        repeatOn: 'lastPage',
      },
    },
  ]);
}

function invoiceFooter(): DesignComponent {
  return section('Pie de factura', position(7, 281, 196, 9), [
    text(
      'Información legal',
      position(3, 2, 160, 5),
      '{{Documento.PieLegal}} · PROVEEDOR TECNOLÓGICO: {{Documento.ProveedorTecnologico}}',
      { fontSizePt: 6.5, color: '#64748b', alignment: 'center' },
    ),
    text(
      'Página',
      position(166, 2, 27, 5),
      'Pág. {{Pagina.Actual}} de {{Pagina.Total}}',
      { fontSizePt: 6.5, color: '#64748b', alignment: 'right' },
    ),
  ]);
}
