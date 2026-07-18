# BTWDocumentDesigner-frontend

Editor de plantillas PDF dinámicas de BTW. MVP desarrollado con Angular 22.
Permite construir una plantilla A4 mediante texto, imagen y contenedor, editar
sus propiedades y exportar el contrato JSON que posteriormente interpretará el
generador de PDF.

## Ejecutar

Requisitos: Node.js 22.22.3 o superior.

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

## Alcance actual

- Hoja A4 y coordenadas en milímetros.
- Componentes de texto, imagen y contenedor.
- Agrupación recursiva de componentes dentro de contenedores.
- Enlace y desvinculación de componentes padre-hijo.
- Selección, movimiento y redimensionamiento.
- Propiedades de texto y enlace mediante ruta XML.
- Carga de imágenes.
- Guardado local y exportación del JSON.

## Próximos incrementos

1. Importar XML y obtener sus rutas disponibles.
2. Sustituir marcadores para la vista previa.
3. Implementar repositorio HTTP y versionamiento.
4. Integrar la vista previa generada por el backend.
