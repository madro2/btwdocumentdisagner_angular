import { NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EditorStore } from '../../application/editor/editor.store';
import { BindingEvaluatorService } from '../../application/bindings/binding-evaluator.service';
import {
  ComponentType,
  DesignComponent,
  DocumentKind,
  documentKindOf,
  PAGE_SIZES,
  PageOrientation,
  PageSize,
  RepeatOn,
  TableColumn,
} from '../../domain/models/template.model';

const TYPE_ICONS: Record<ComponentType, string> = {
  text: 'T',
  image: '▧',
  container: '□',
  table: '▦',
  link: '↗',
  qrCode: '▣',
  pageNumber: '#',
  line: '—',
  rectangle: '▭',
  barcode: '▥',
  pageBreak: '↡',
};

type InteractionMode = 'move' | 'resize';

interface Interaction {
  id: string;
  mode: InteractionMode;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

const CSS_MM_IN_PX = 96 / 25.4;

@Component({
  selector: 'app-editor-page',
  imports: [FormsModule, NgTemplateOutlet, RouterLink],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.css',
})
export class EditorPage {
  readonly store = inject(EditorStore);
  readonly status = signal('Borrador sin guardar');
  readonly documentKindOf = documentKindOf;
  private readonly bindings = inject(BindingEvaluatorService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private interaction: Interaction | null = null;

  readonly pickerRange = Array.from({ length: 8 }, (_, index) => index + 1);
  readonly tablePickerOpen = signal(false);
  readonly pickerCols = signal(4);
  readonly pickerRows = signal(4);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.store.createNew();
      this.bindings.configure(this.store.template());
      return;
    }

    this.store.loadById(id).subscribe((loaded) => {
      if (loaded) {
        this.status.set('Formato cargado');
        this.bindings.configure(this.store.template());
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  formatOptions(): { id: PageSize; label: string }[] {
    const kind = documentKindOf(this.store.template().page);
    return (Object.keys(PAGE_SIZES) as PageSize[])
      .filter((size) => PAGE_SIZES[size].kind === kind)
      .map((size) => ({ id: size, label: PAGE_SIZES[size].label }));
  }

  setDocumentKind(kind: DocumentKind): void {
    this.store.setDocumentKind(kind);
    this.status.set(
      kind === 'pos' ? 'Documento tipo tirilla POS' : 'Documento tipo PDF',
    );
  }

  setPageFormat(event: Event): void {
    const size = (event.target as HTMLSelectElement).value as PageSize;
    this.store.setPageFormat(size);
    this.status.set(`Tamaño de hoja: ${PAGE_SIZES[size].label}`);
  }

  setOrientation(event: Event): void {
    const orientation = (event.target as HTMLSelectElement)
      .value as PageOrientation;
    this.store.setOrientation(orientation);
    this.status.set(
      orientation === 'portrait'
        ? 'Orientación vertical'
        : 'Orientación horizontal',
    );
  }

  updatePageHeight(event: Event): void {
    this.store.setPageHeight(Number((event.target as HTMLInputElement).value));
    this.status.set('Alto de la tirilla actualizado');
  }

  updatePageBackground(event: Event): void {
    this.store.setPageBackground((event.target as HTMLInputElement).value);
    this.status.set('Color de hoja actualizado');
  }

  iconFor(type: ComponentType): string {
    return TYPE_ICONS[type];
  }

  add(type: ComponentType): void {
    this.store.addElement(type);
    this.status.set('Cambios sin guardar');
  }

  toggleTablePicker(event: Event): void {
    event.stopPropagation();
    this.tablePickerOpen.update((open) => !open);
  }

  hoverPicker(cols: number, rows: number): void {
    this.pickerCols.set(cols);
    this.pickerRows.set(rows);
  }

  pickTableSize(columns: number, rows: number): void {
    this.store.addElement('table', undefined, null, { columns, rows });
    this.tablePickerOpen.set(false);
    this.status.set(`Tabla de ${columns} × ${rows} agregada`);
  }

  @HostListener('document:click')
  closeTablePicker(): void {
    this.tablePickerOpen.set(false);
  }

  tableRows(element: DesignComponent): number {
    const rows = element.content?.rows;
    return typeof rows === 'number' ? rows : 2;
  }

  tableColumns(element: DesignComponent): TableColumn[] {
    return element.columns ?? [];
  }

  /** Modo efectivo de la tabla según el contrato 2.1. */
  tableMode(element: DesignComponent): 'fixedRows' | 'record' | 'collection' {
    const mode = element.content?.mode;
    if (mode === 'fixedRows' || mode === 'record') return mode;
    return 'collection';
  }

  tableHasHeader(element: DesignComponent): boolean {
    return this.tableColumns(element).some((column) => !!column.title);
  }

  /** Matriz de celdas a dibujar en el canvas según el modo de la tabla. */
  tableBodyRows(element: DesignComponent): string[][] {
    const columns = this.tableColumns(element);
    const content = element.content ?? {};

    if (this.tableMode(element) === 'fixedRows' && Array.isArray(content.rows)) {
      return content.rows.map((row) =>
        columns.map((column, index) => {
          if (column.value) return column.value;
          if (index === 0) return row.label ?? '';
          return row.value ?? row.dataPath ?? '';
        }),
      );
    }

    if (this.tableMode(element) === 'record') {
      const fields = content.fields ?? [];
      return [
        columns.map((column) => {
          const field = fields.find((item) => item.column === column.id);
          return field?.value ?? field?.dataPath ?? '—';
        }),
      ];
    }

    const collectionPath = content.collectionPath ?? content.dataPath;
    const records = collectionPath
      ? this.bindings.collection(collectionPath)
      : [];
    if (records.length) {
      const alias = content.rowAlias ?? 'Row';
      return records.map((record) =>
        columns.map((column) =>
          this.bindings.render(
            column.value ?? (column.dataPath ? `{{${column.dataPath}}}` : ''),
            { aliases: { [alias]: record } },
            {},
            column.defaultValue ?? '',
          ),
        ),
      );
    }

    return Array.from({ length: this.tableRows(element) }, (_, rowIndex) =>
      columns.map((column) =>
        rowIndex === 0 ? column.value || column.dataPath || '—' : '',
      ),
    );
  }

  createNew(): void {
    this.store.createNew();
    this.bindings.configure(this.store.template());
    this.status.set('Nuevo contrato 3.0');
  }

  previewText(element: DesignComponent): string {
    return this.bindings.render(
      element.content?.value,
      {},
      element.content?.bindings,
      String(element.content?.defaultValue ?? ''),
    );
  }

  previewImageSource(element: DesignComponent): string | null {
    const path = element.content?.dataPath;
    const value = path ? this.bindings.resolve(path) : null;
    if (typeof value !== 'string' || !value) return null;
    if (value.startsWith('data:image/')) return value;
    if (value.startsWith('/9j/')) return `data:image/jpeg;base64,${value}`;
    if (value.startsWith('iVBOR')) return `data:image/png;base64,${value}`;
    if (value.startsWith('R0lGOD')) return `data:image/gif;base64,${value}`;
    return null;
  }

  importJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const error = this.store.importContract(JSON.parse(String(reader.result)));
        if (error) {
          this.status.set(error);
          return;
        }
        this.bindings.configure(this.store.template());
        this.status.set(`Contrato ${this.store.template().schemaVersion} importado`);
      } catch (error) {
        this.status.set(`JSON inválido: ${(error as Error).message}`);
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  importXml(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.bindings.configure(this.store.template());
      const error = this.bindings.loadXml(String(reader.result));
      this.status.set(
        error ??
          `XML cargado · ${this.bindings.availablePaths().length} rutas disponibles`,
      );
      input.value = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  importRuntime(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          this.status.set('El runtime debe ser un objeto JSON.');
          return;
        }
        const envelope = parsed as Record<string, unknown>;
        const runtime =
          envelope['runtime'] &&
          typeof envelope['runtime'] === 'object' &&
          !Array.isArray(envelope['runtime'])
            ? (envelope['runtime'] as Record<string, unknown>)
            : envelope;
        this.bindings.setRuntime(runtime);
        this.status.set(
          `Runtime cargado · ${Object.keys(runtime).length} parámetros`,
        );
      } catch (error) {
        this.status.set(`Runtime JSON inválido: ${(error as Error).message}`);
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  cellAlignment(element: DesignComponent, columnIndex: number): string {
    return (
      this.tableColumns(element)[columnIndex]?.alignment ??
      element.style?.alignment ??
      'left'
    );
  }

  cellBold(element: DesignComponent, columnIndex: number): boolean {
    return this.tableColumns(element)[columnIndex]?.style?.bold ?? false;
  }

  tableBorderless(element: DesignComponent): boolean {
    return element.style?.border?.style === 'none';
  }

  updateRows(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const rows = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(rows) || rows < 1) return;
    this.store.updateContent(selected.id, { rows: Math.min(rows, 100) });
    this.status.set('Cambios sin guardar');
  }

  repeatOnFor(element: DesignComponent): RepeatOn {
    return element.behavior?.repeatOn ?? 'allPages';
  }

  repeatOnLabel(element: DesignComponent): string {
    switch (this.repeatOnFor(element)) {
      case 'firstPage':
        return 'Solo primera';
      case 'lastPage':
        return 'Solo última';
      default:
        return 'Todas';
    }
  }

  updateRepeatOn(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const repeatOn = (event.target as HTMLSelectElement).value as RepeatOn;
    this.store.updateRepeatOn(selected.id, repeatOn);
    this.status.set('Comportamiento de impresión actualizado');
  }

  startPaletteDrag(event: DragEvent, type: ComponentType): void {
    event.dataTransfer?.setData('application/x-component-type', type);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  allowDrop(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('application/x-component-type')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  dropOnPage(event: DragEvent): void {
    const type = event.dataTransfer?.getData('application/x-component-type');
    if (!type) return;

    event.preventDefault();
    const page = event.currentTarget as HTMLElement;
    const rect = page.getBoundingClientRect();
    const scaleX =
      rect.width / (this.store.template().page.widthMm * CSS_MM_IN_PX);
    const scaleY =
      rect.height / (this.store.template().page.heightMm * CSS_MM_IN_PX);

    this.store.addElement(type as ComponentType, {
      x: (event.clientX - rect.left) / (CSS_MM_IN_PX * scaleX),
      y: (event.clientY - rect.top) / (CSS_MM_IN_PX * scaleY),
    });
    this.status.set('Cambios sin guardar');
  }

  allowContainerDrop(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('application/x-component-type')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }

  dropOnContainer(event: DragEvent, container: DesignComponent): void {
    const type = event.dataTransfer?.getData('application/x-component-type');
    if (!type) return;

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const scaleX = rect.width / (container.position.width * CSS_MM_IN_PX);
    const scaleY = rect.height / (container.position.height * CSS_MM_IN_PX);

    this.store.addElement(
      type as ComponentType,
      {
        x: (event.clientX - rect.left) / (CSS_MM_IN_PX * scaleX),
        y: (event.clientY - rect.top) / (CSS_MM_IN_PX * scaleY),
      },
      container.id,
    );
    this.status.set(
      `Componente agregado dentro de ${container.name ?? 'contenedor'}`,
    );
  }

  select(event: PointerEvent, element: DesignComponent): void {
    event.stopPropagation();
    this.store.select(element.id);
  }

  startInteraction(
    event: PointerEvent,
    element: DesignComponent,
    mode: InteractionMode,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.store.select(element.id);
    this.interaction = {
      id: element.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: element.position.x,
      initialY: element.position.y,
      initialWidth: element.position.width,
      initialHeight: element.position.height,
    };
  }

  @HostListener('document:pointermove', ['$event'])
  moveInteraction(event: PointerEvent): void {
    if (!this.interaction) return;

    const deltaX =
      (event.clientX - this.interaction.startClientX) / CSS_MM_IN_PX;
    const deltaY =
      (event.clientY - this.interaction.startClientY) / CSS_MM_IN_PX;

    if (this.interaction.mode === 'move') {
      const selected = this.store.selectedElement();
      if (!selected) return;
      const bounds = this.store.getElementBounds(selected.id);
      const maxX = bounds.width - selected.position.width;
      const maxY = bounds.height - selected.position.height;
      this.store.updatePosition(this.interaction.id, {
        x: clamp(this.interaction.initialX + deltaX, 0, maxX),
        y: clamp(this.interaction.initialY + deltaY, 0, maxY),
      });
    } else {
      const bounds = this.store.getElementBounds(this.interaction.id);
      const maxWidth = bounds.width - this.interaction.initialX;
      const maxHeight = bounds.height - this.interaction.initialY;
      this.store.updatePosition(this.interaction.id, {
        width: clamp(this.interaction.initialWidth + deltaX, 5, maxWidth),
        height: clamp(this.interaction.initialHeight + deltaY, 5, maxHeight),
      });
    }

    this.status.set('Cambios sin guardar');
  }

  @HostListener('document:pointerup')
  endInteraction(): void {
    this.interaction = null;
  }

  updateNumber(
    property: 'x' | 'y' | 'width' | 'height',
    event: Event,
  ): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updatePosition(selected.id, {
      [property]: Number((event.target as HTMLInputElement).value),
    });
    this.status.set('Cambios sin guardar');
  }

  updateText(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateContent(selected.id, {
      value: (event.target as HTMLTextAreaElement).value,
    });
    this.status.set('Cambios sin guardar');
  }

  updateUrl(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateContent(selected.id, {
      url: (event.target as HTMLInputElement).value,
    });
    this.status.set('Cambios sin guardar');
  }

  addColumn(): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const columns = this.tableColumns(selected);
    this.store.updateElement(selected.id, {
      columns: [
        ...columns,
        {
          id: `col-${columns.length + 1}`,
          title: `Columna ${columns.length + 1}`,
          widthMm: 30,
        },
      ],
    });
    this.status.set('Columna agregada');
  }

  updateColumn(
    column: TableColumn,
    property: 'title' | 'dataPath',
    event: Event,
  ): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const value = (event.target as HTMLInputElement).value;
    this.store.updateElement(selected.id, {
      columns: this.tableColumns(selected).map((item) =>
        item.id === column.id ? { ...item, [property]: value } : item,
      ),
    });
    this.status.set('Cambios sin guardar');
  }

  removeColumn(column: TableColumn): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    this.store.updateElement(selected.id, {
      columns: this.tableColumns(selected).filter(
        (item) => item.id !== column.id,
      ),
    });
    this.status.set('Columna eliminada');
  }

  updateDataPath(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateContent(selected.id, {
      dataPath: (event.target as HTMLInputElement).value,
    });
    this.status.set('Cambios sin guardar');
  }

  updateFontSize(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateStyle(selected.id, {
      fontSizePt: Number((event.target as HTMLInputElement).value),
    });
  }

  updateColor(property: 'color' | 'background', event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateStyle(selected.id, {
      [property]: (event.target as HTMLInputElement).value,
    });
  }

  toggleBold(): void {
    const selected = this.store.selectedElement();
    if (!selected) return;
    this.store.updateStyle(selected.id, {
      bold: !selected.style?.bold,
    });
  }

  changeParent(event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const parentId = (event.target as HTMLSelectElement).value || null;
    if (this.store.moveToParent(selected.id, parentId)) {
      const parent = parentId
        ? this.store.availableParents().find((item) => item.id === parentId)
        : null;
      this.status.set(
        parent
          ? `Componente vinculado a ${parent.name ?? parent.id}`
          : 'Componente movido a la hoja',
      );
    }
  }

  loadImage(event: Event): void {
    const selected = this.store.selectedElement();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!selected || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.store.updateContent(selected.id, {
        previewSrc: String(reader.result),
        source: 'asset',
      });
      this.status.set('Imagen cargada; cambios sin guardar');
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    this.store.save().subscribe(() => {
      this.status.set('Formato guardado en el servidor');
    });
  }

  exportJson(): void {
    const errors = this.store.validationErrors();
    if (errors.length) {
      this.status.set(`No se puede exportar: ${errors[0]}`);
      return;
    }

    const template = this.store.template();
    const { updatedAt: _updatedAt, ...contract } = template;
    const blob = new Blob([JSON.stringify(contract, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.document.name || 'plantilla'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.status.set(`Contrato JSON ${template.schemaVersion} exportado`);
  }

  remove(): void {
    this.store.removeSelected();
    this.status.set('Componente eliminado');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
