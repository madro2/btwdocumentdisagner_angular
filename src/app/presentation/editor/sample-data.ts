/**
 * Datos de prueba para la vista previa del lienzo: los marcadores
 * {{Ruta.Campo}} se sustituyen por valores de ejemplo para que el
 * usuario vea un documento realista mientras diseña. El contrato
 * guardado conserva los marcadores originales.
 */

const SAMPLE_VALUES: Record<string, string> = {
  'Emisor.RazonSocial': 'BTW Soluciones S.A.S.',
  'Emisor.Nit': '900.123.456-7',
  'Emisor.Telefono': '(601) 555 01 23',
  'Emisor.Direccion': 'Cra. 15 # 88-64, Bogotá D.C.',
  'Emisor.Correo': 'facturacion@btwsoluciones.co',
  'Emisor.Logo': '',

  'Cliente.RazonSocial': 'Comercializadora Andina Ltda.',
  'Cliente.TipoDocumento': 'NIT',
  'Cliente.NumeroDocumento': '830.987.654-3',
  'Cliente.Telefono': '(604) 444 22 11',
  'Cliente.Direccion': 'Cl. 10 # 43A-30',
  'Cliente.Ciudad': 'Medellín',
  'Cliente.Departamento': 'Antioquia',
  'Cliente.Pais': 'Colombia',

  'Factura.Prefijo': 'FE',
  'Factura.Numero': '12345',
  'Factura.FechaEmision': '18/07/2026',
  'Factura.FechaVencimiento': '17/08/2026',
  'Factura.FormaPago': 'Crédito',
  'Factura.MedioPago': 'Transferencia bancaria',
  'Factura.NumeroPedido': 'PED-00891',
  'Factura.LineaNegocio': 'Servicios',
  'Factura.Observaciones':
    'Entrega en bodega principal. Pago a 30 días según acuerdo comercial.',
  'Factura.Moneda': 'COP',

  'Dian.Resolucion': '18764003688415',
  'Dian.FechaAutorizacion': '15/01/2026',
  'Dian.RangoAutorizado': 'FE 1 al 50.000',
  'Dian.Cufe': 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',

  'Totales.Subtotal': '$ 1.250.000',
  'Totales.Descuento': '$ 0',
  'Totales.Iva': '$ 237.500',
  'Totales.OtrosImpuestos': '$ 0',
  'Totales.Retenciones': '$ 31.250',
  'Totales.Total': '$ 1.456.250',
  'Totales.ValorEnLetras':
    'Un millón cuatrocientos cincuenta y seis mil doscientos cincuenta pesos M/CTE',

  'Documento.Tipo': 'DOCUMENTO',
  'Documento.Referencia': 'REF-00123',
  'Documento.PieLegal':
    'Esta factura se asimila en sus efectos a la letra de cambio (Art. 774 C. de Co.)',
  'Documento.ProveedorTecnologico': 'BTW S.A.S.',
  'Documento.PieDePagina': 'Documento generado electrónicamente',

  'Pagina.Actual': '1',
  'Pagina.Total': '1',

  'Encabezado.Titulo': 'Nombre de la empresa',
  'Encabezado.Descripcion': 'Descripción breve de la organización',
  'Encabezado.InformacionAdicional': 'Dirección · Teléfono · Correo',
  'Encabezado.Imagen': '',

  'Seccion.Titulo': 'Título de la sección',
  'Seccion.Contenido': 'Contenido de ejemplo para esta sección.',
  'Seccion.ColumnaIzquierda': 'Contenido de ejemplo de la columna izquierda.',
  'Seccion.ColumnaDerecha': 'Contenido de ejemplo de la columna derecha.',
  'Seccion.Notas': 'Texto de ejemplo para las notas del documento.',
  'Seccion.Etiqueta': 'ETIQUETA',
  'Seccion.ValorDestacado': 'Valor de ejemplo',

  'Resumen.Valor1': '$ 100.000',
  'Resumen.Valor2': '$ 50.000',
  'Resumen.Valor3': '$ 25.000',
  'Resumen.Total': '$ 175.000',
};

/** Filas de ejemplo por alias de colección: una lista de valores por campo. */
const SAMPLE_ROWS: Record<string, Record<string, string[]>> = {
  Item: {
    Codigo: ['PRD-001', 'PRD-014', 'SRV-002', 'PRD-027'],
    Descripcion: [
      'Papel bond carta 75 g × 500 hojas',
      'Tóner original impresora láser',
      'Servicio de mantenimiento preventivo',
      'Archivador metálico 4 gavetas',
    ],
    Cantidad: ['10', '2', '1', '3'],
    Unidad: ['UND', 'UND', 'SRV', 'UND'],
    ValorUnitario: ['$ 18.500', '$ 320.000', '$ 250.000', '$ 95.000'],
    PorcentajeIva: ['19%', '19%', '19%', '19%'],
    Total: ['$ 185.000', '$ 640.000', '$ 250.000', '$ 285.000'],
  },
  Impuesto: {
    Nombre: ['IVA'],
    Detalle: ['IVA 19%'],
    Tarifa: ['19%'],
    Base: ['$ 1.250.000'],
    Total: ['$ 237.500'],
  },
  Fila: {
    Columna1: ['Dato A', 'Dato B', 'Dato C', 'Dato D'],
    Columna2: ['Descripción de ejemplo', 'Descripción de ejemplo', 'Descripción de ejemplo', 'Descripción de ejemplo'],
    Columna3: ['Valor', 'Valor', 'Valor', 'Valor'],
    Columna4: ['$ 100', '$ 200', '$ 300', '$ 400'],
  },
};

const PLACEHOLDER_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Reemplaza cada {{Ruta.Campo}} por su dato de prueba. */
export function withSampleData(value: string | undefined): string {
  if (!value) return '';
  return value.replace(PLACEHOLDER_RE, (_, path: string) => {
    const known = SAMPLE_VALUES[path];
    if (known !== undefined) return known;
    const lastSegment = path.split('.').pop() ?? path;
    return lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2');
  });
}

/** Dato de prueba para una celda de tabla de colección. */
export function sampleCell(
  rowAlias: string | undefined,
  dataPath: string | undefined,
  rowIndex: number,
): string {
  if (!dataPath) return '';
  if (/^linea$/i.test(dataPath)) return String(rowIndex + 1);

  const rowSamples = rowAlias ? SAMPLE_ROWS[rowAlias] : undefined;
  const values = rowSamples?.[dataPath];
  if (values?.length) return values[rowIndex % values.length];

  const known =
    SAMPLE_VALUES[rowAlias ? `${rowAlias}.${dataPath}` : dataPath] ??
    SAMPLE_VALUES[dataPath];
  if (known !== undefined) return known;

  return dataPath.replace(/([a-z])([A-Z])/g, '$1 $2');
}
