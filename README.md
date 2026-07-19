# BTWDocumentDesigner-frontend

Editor de plantillas PDF dinámicas de BTW desarrollado con Angular 22. Lee,
previsualiza y exporta el contrato compartido 3.0 que interpreta el generador
.NET.

## Ejecutar

Requisito: Node.js 24.15 o 26.

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

Para verificar la compilación de producción:

```bash
npm run build
```

## Arquitectura

```text
src/app/
├── domain/
│   ├── models/       Contrato JSON sin dependencias de UI
│   ├── factories/    Creación de los elementos
│   └── ports/        Interfaces para servicios externos
├── application/
│   ├── bindings/     XML, rutas, colecciones, filtros y computed fields
│   └── editor/       Estado y operaciones del editor
├── infrastructure/
│   └── persistence/  Adaptador temporal de localStorage
└── presentation/
    └── editor/       Interfaz Angular
```

Las dependencias apuntan hacia el dominio:

```text
Presentación → Aplicación → Dominio
Infraestructura ─────────→ Dominio
```

Cuando exista una API, se crea otro adaptador de `TemplateRepository`; el
estado y los componentes visuales no necesitan conocer si la plantilla se
guarda localmente o en el backend.

## Funcionalidad

- Contratos 2.1, 2.2 y 3.0, sin degradar contratos importados.
- Formatos A4, Letter, Legal, POS y Custom en milímetros.
- Importación de contrato JSON, factura XML y parámetros runtime desde la barra
  del editor.
- Vista previa de paths XML, tablas de colección, runtime, filtros, lookups y
  computed fields.
- Componentes de texto, link, imagen, tabla, contenedor, QR, número de página,
  línea, rectángulo, barcode y salto de página.
- Agrupación recursiva de componentes dentro de contenedores.
- Enlace y desvinculación de componentes padre-hijo.
- Selección, movimiento y redimensionamiento.
- Carga de imágenes.
- Guardado local, importación y exportación del JSON 3.0.
- Detección de XML inválido y advertencia no bloqueante cuando contiene texto
  dañado por codificación.

El contrato validado de referencia está en
`../UtilFiles/design-contract-btw-v3.0.json`.

## Evolución prevista

1. Repositorio HTTP para sustituir el guardado local.
2. Editor visual de runtime, anchors y reglas de paginación.
3. Vista previa PDF devuelta directamente por el backend.
