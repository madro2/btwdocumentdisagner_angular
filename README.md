# BTWDocumentDesigner-frontend

Editor de plantillas PDF dinámicas de BTW. Angular 22.

Este commit representa la **estructura base** (capas y contratos), sin UI del
editor ni operaciones de visualización.

## Ejecutar

Requisitos: Node.js 22.22.3 o superior.

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

## Arquitectura

```text
src/app/
├── domain/
│   ├── models/       Contrato JSON sin dependencias de UI
│   ├── factories/    Creación de los elementos
│   └── ports/        Interfaces para servicios externos
├── application/
│   └── editor/       Estado del editor (esqueleto)
├── infrastructure/
│   └── persistence/  Adaptador local (esqueleto)
└── presentation/
    └── editor/       Página del editor (sin canvas aún)
```

Las dependencias apuntan hacia el dominio:

```text
Presentación → Aplicación → Dominio
Infraestructura ─────────→ Dominio
```

## Alcance actual

- Capas Clean Architecture definidas.
- Modelos del contrato JSON (`PdfTemplate`, `PdfElement`, etc.).
- Puerto `TemplateRepository` y token de inyección.
- Stubs de store, repositorio local y página del editor.

## Próximos incrementos

1. Canvas A4 y paleta de componentes.
2. Selección, movimiento y propiedades.
3. Persistencia local y exportación JSON.
4. Repositorio HTTP y vista previa del backend.
