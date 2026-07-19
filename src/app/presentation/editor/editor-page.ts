import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EditorStore, rectsOverlap } from '../../application/editor/editor.store';
import { BindingEvaluatorService } from '../../application/bindings/binding-evaluator.service';
import {
  CONTAINER_PRESETS,
  ContainerPresetKind,
  createContainerPreset,
} from '../../domain/factories/block.factory';
import { confirmAction, notifySuccess } from '../shared/alerts';
import {
  DataSourceCatalogService,
  DataSourceCollection,
  DataSourceField,
} from '../../infrastructure/data-sources/data-source-catalog.service';
import { sampleCell, withSampleData } from './sample-data';
import {
  ComponentType,
  DesignComponent,
  DocumentKind,
  documentKindOf,
  FixedTableRow,
  PAGE_SIZES,
  PageOrientation,
  PageSize,
  RepeatOn,
  TableColumn,
  TextAlignment,
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
type ListKind = 'bullet' | 'number';

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

interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  positionMm: number;
}

const CSS_MM_IN_PX = 96 / 25.4;
const SNAP_MM = 1.5;
const INDENT_STEP_MM = 4;
const MAX_INDENT_MM = 40;
const BULLET_PREFIXES = ['• ', '○ ', '■ ', '– '];
const NUMBER_PREFIX_RE = /^(?:\d+|[a-z]|[ivxlcdm]+)\.\s+/i;
const NATIONAL_INVOICE_TEMPLATE = {
  name: 'Factura electrónica nacional',
  version: 1,
} as const;

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
  private readonly dataSourceCatalog = inject(DataSourceCatalogService);
  private interaction: Interaction | null = null;

  readonly containerPresets = CONTAINER_PRESETS;
  readonly pickerRange = Array.from({ length: 8 }, (_, index) => index + 1);
  readonly tablePickerOpen = signal(false);
  readonly pickerCols = signal(4);
  readonly pickerRows = signal(4);

  readonly alignmentGuides = signal<AlignmentGuide[]>([]);
  readonly openMenu = signal<'spacing' | null>(null);
  readonly lineSpacingOptions = [1, 1.15, 1.5, 2, 2.5, 3];
  readonly dataSourceCollections = signal<DataSourceCollection[]>([]);
  readonly dataSourceQuery = signal('');
  readonly filteredDataSourceCollections = computed(() => {
    const query = this.dataSourceQuery().trim().toLowerCase();
    if (!query) return this.dataSourceCollections();
    return this.dataSourceCollections()
      .map((collection) => ({
        ...collection,
        fields: collection.fields.filter((field) =>
          [field.displayName, field.name, field.description, field.path].some((value) =>
            value.toLowerCase().includes(query),
          ),
        ),
      }))
      .filter((collection) => collection.fields.length > 0);
  });

  constructor() {
    this.dataSourceCatalog.list().subscribe({
      next: (collections) => this.dataSourceCollections.set(collections),
      error: () => this.dataSourceCollections.set([]),
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      const preset = this.route.snapshot.queryParamMap.get('preset');
      if (preset === 'standard-invoice') {
        this.status.set('Cargando plantilla desde la base de datos...');
        this.store
          .startFromSavedTemplate(NATIONAL_INVOICE_TEMPLATE.name, NATIONAL_INVOICE_TEMPLATE.version)
          .subscribe({
            next: (loaded) => {
              if (!loaded) {
                this.status.set('La plantilla de factura electrónica nacional no está registrada.');
                void this.router.navigate(['/']);
                return;
              }

              this.bindings.configure(this.store.template());
              this.status.set(
                `Plantilla ${NATIONAL_INVOICE_TEMPLATE.name} v${NATIONAL_INVOICE_TEMPLATE.version} cargada`,
              );
            },
            error: () => {
              this.status.set('No fue posible cargar la plantilla desde el servidor.');
            },
          });
        return;
      }

      this.store.createNew();

      const size = this.route.snapshot.queryParamMap.get('size') as PageSize | null;
      if (size && size in PAGE_SIZES) {
        this.store.setPageFormat(size);
      }
      const orientation = this.route.snapshot.queryParamMap.get('orientation');
      if (orientation === 'landscape') {
        this.store.setOrientation('landscape');
      }
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
    this.status.set(kind === 'pos' ? 'Documento tipo tirilla POS' : 'Documento tipo PDF');
  }

  setPageFormat(event: Event): void {
    const size = (event.target as HTMLSelectElement).value as PageSize;
    this.store.setPageFormat(size);
    this.status.set(`Tamaño de hoja: ${PAGE_SIZES[size].label}`);
  }

  setOrientation(event: Event): void {
    const orientation = (event.target as HTMLSelectElement).value as PageOrientation;
    this.store.setOrientation(orientation);
    this.status.set(orientation === 'portrait' ? 'Orientación vertical' : 'Orientación horizontal');
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
  closeFloatingUi(): void {
    this.tablePickerOpen.set(false);
    this.openMenu.set(null);
  }

  paragraphToolsEnabled(): boolean {
    const selected = this.store.selectedElement();
    return !!selected && (selected.type === 'text' || selected.type === 'link');
  }

  currentAlignment(): TextAlignment {
    return this.store.selectedElement()?.style?.alignment ?? 'left';
  }

  currentLineHeight(): number {
    return this.store.selectedElement()?.style?.lineHeight ?? 1.15;
  }

  toggleMenu(menu: 'spacing', event: Event): void {
    event.stopPropagation();
    this.openMenu.update((current) => (current === menu ? null : menu));
  }

  setAlignment(alignment: TextAlignment): void {
    const selected = this.store.selectedElement();
    if (!selected || !this.paragraphToolsEnabled()) return;
    this.store.updateStyle(selected.id, { alignment });
    this.status.set('Alineación actualizada');
  }

  increaseIndent(): void {
    this.adjustIndent(INDENT_STEP_MM);
  }

  decreaseIndent(): void {
    this.adjustIndent(-INDENT_STEP_MM);
  }

  setLineHeight(value: number): void {
    const selected = this.store.selectedElement();
    if (!selected || !this.paragraphToolsEnabled()) return;
    this.store.updateStyle(selected.id, { lineHeight: value });
    this.openMenu.set(null);
    this.status.set(`Interlineado ${value}`);
  }

  toggleList(kind: ListKind): void {
    if (kind === 'bullet') {
      this.applyListStyle('bullet', '•');
      return;
    }
    this.applyListStyle('number', '1.');
  }

  private applyListStyle(kind: ListKind, marker: string): void {
    const selected = this.store.selectedElement();
    if (!selected || !this.paragraphToolsEnabled()) return;

    const value = selected.content?.value ?? '';
    const lines = value.length ? value.split('\n') : [''];
    const stripped = lines.map((line) => stripListPrefix(line));
    const alreadyApplied =
      kind === 'bullet'
        ? lines.every((line) => line.startsWith(`${marker} `) || !line.trim())
        : lines.every((line) => NUMBER_PREFIX_RE.test(line) || !line.trim());

    const next = alreadyApplied
      ? stripped.join('\n')
      : kind === 'bullet'
        ? stripped.map((line) => (line.trim() ? `${marker} ${line}` : line)).join('\n')
        : stripped
            .map((line, index) =>
              line.trim() ? `${formatListMarker(marker, index)} ${line}` : line,
            )
            .join('\n');

    this.store.updateContent(selected.id, { value: next });
    this.openMenu.set(null);
    this.status.set(kind === 'bullet' ? 'Viñetas actualizadas' : 'Numeración actualizada');
  }

  private adjustIndent(delta: number): void {
    const selected = this.store.selectedElement();
    if (!selected || !this.paragraphToolsEnabled()) return;
    const next = clamp((selected.style?.padding ?? 0) + delta, 0, MAX_INDENT_MM);
    this.store.updateStyle(selected.id, { padding: next });
    this.status.set('Sangría actualizada');
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
          if (column.value) {
            return this.previewBindingValue(
              column.value,
              column.defaultValue ?? '',
            );
          }
          if (index === 0) return this.previewBindingValue(row.label);
          if (row.value) {
            return this.previewBindingValue(row.value, row.defaultValue ?? '');
          }
          return row.dataPath
            ? this.previewBindingValue(
                `{{${row.dataPath}}}`,
                row.defaultValue ?? '',
              )
            : (row.defaultValue ?? '');
        }),
      );
    }

    if (this.tableMode(element) === 'record') {
      const fields = content.fields ?? [];
      return [
        columns.map((column) => {
          const field = fields.find((item) => item.column === column.id);
          if (field?.value) {
            return this.previewBindingValue(
              field.value,
              field.defaultValue ?? '',
            );
          }
          return field?.dataPath
            ? this.previewBindingValue(
                `{{${field.dataPath}}}`,
                field.defaultValue ?? '',
              )
            : '—';
        }),
      ];
    }

    const rowAlias = content.rowAlias;
    const collectionPath = content.collectionPath ?? content.dataPath;
    const records = collectionPath ? this.bindings.collection(collectionPath) : [];
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
        column.value ? column.value : sampleCell(rowAlias, column.dataPath, rowIndex),
      ),
    );
  }

  previewText(element: DesignComponent): string {
    return this.bindings.render(
      element.content?.value,
      {},
      element.content?.bindings,
      String(element.content?.defaultValue ?? ''),
    );
  }

  /**
   * Usa el XML real cuando el usuario ya lo cargó. Los valores de ejemplo se
   * conservan únicamente para que una plantilla nueva no aparezca vacía.
   */
  private previewBindingValue(template: string | undefined, defaultValue = ''): string {
    const resolved = this.bindings.render(template, {}, {}, defaultValue);
    if (resolved || this.bindings.hasLoadedXml()) return resolved;
    return withSampleData(template) || defaultValue;
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
        error ?? `XML cargado · ${this.bindings.availablePaths().length} rutas disponibles`,
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
        this.status.set(`Runtime cargado · ${Object.keys(runtime).length} parámetros`);
      } catch (error) {
        this.status.set(`Runtime JSON inválido: ${(error as Error).message}`);
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  cellAlignment(element: DesignComponent, columnIndex: number): string {
    return this.tableColumns(element)[columnIndex]?.alignment ?? element.style?.alignment ?? 'left';
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

  startContainerPresetDrag(event: DragEvent, kind: ContainerPresetKind): void {
    event.dataTransfer?.setData('application/x-container-preset-kind', kind);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  startDataSourceFieldDrag(event: DragEvent, field: DataSourceField): void {
    event.dataTransfer?.setData('application/x-data-source-field', JSON.stringify(field));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  addDataSourceField(field: DataSourceField): void {
    this.store.addDataSourceField(field);
    this.status.set(`Campo "${field.displayName}" enlazado a ${field.path}`);
  }

  searchDataSourceFields(event: Event): void {
    this.dataSourceQuery.set((event.target as HTMLInputElement).value);
  }

  addContainerPreset(kind: ContainerPresetKind): void {
    const container = createContainerPreset(kind);
    this.store.addPrefab(container);
    this.status.set(`Contenedor "${container.name}" agregado`);
  }

  allowDrop(event: DragEvent): void {
    if (this.hasPaletteData(event)) {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'copy';
    }
  }

  dropOnPage(event: DragEvent): void {
    if (!this.hasPaletteData(event)) return;

    event.preventDefault();
    const page = event.currentTarget as HTMLElement;
    const rect = page.getBoundingClientRect();
    const scaleX = rect.width / (this.store.template().page.widthMm * CSS_MM_IN_PX);
    const scaleY = rect.height / (this.store.template().page.heightMm * CSS_MM_IN_PX);
    const dropPoint = {
      x: (event.clientX - rect.left) / (CSS_MM_IN_PX * scaleX),
      y: (event.clientY - rect.top) / (CSS_MM_IN_PX * scaleY),
    };

    const presetKind = event.dataTransfer?.getData('application/x-container-preset-kind');
    if (presetKind) {
      const container = createContainerPreset(presetKind as ContainerPresetKind);
      this.store.addPrefab(container, dropPoint);
      this.status.set(`Contenedor "${container.name}" agregado`);
      return;
    }

    const dataSourceField = this.readDataSourceField(event);
    if (dataSourceField) {
      this.store.addDataSourceField(dataSourceField, dropPoint);
      this.status.set(`Campo "${dataSourceField.displayName}" enlazado a ${dataSourceField.path}`);
      return;
    }

    const type = event.dataTransfer?.getData('application/x-component-type');
    if (!type) return;
    this.store.addElement(type as ComponentType, dropPoint);
    this.status.set('Cambios sin guardar');
  }

  allowContainerDrop(event: DragEvent): void {
    if (!this.hasPaletteData(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = 'copy';
  }

  dropOnContainer(event: DragEvent, container: DesignComponent): void {
    if (!this.hasPaletteData(event)) return;

    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const scaleX = rect.width / (container.position.width * CSS_MM_IN_PX);
    const scaleY = rect.height / (container.position.height * CSS_MM_IN_PX);
    const dropPoint = {
      x: (event.clientX - rect.left) / (CSS_MM_IN_PX * scaleX),
      y: (event.clientY - rect.top) / (CSS_MM_IN_PX * scaleY),
    };

    const presetKind = event.dataTransfer?.getData('application/x-container-preset-kind');
    if (presetKind) {
      const preset = createContainerPreset(presetKind as ContainerPresetKind);
      this.store.addPrefab(preset, dropPoint, container.id);
      this.status.set(`Contenedor agregado dentro de ${container.name ?? 'contenedor'}`);
      return;
    }

    const dataSourceField = this.readDataSourceField(event);
    if (dataSourceField) {
      this.store.addDataSourceField(dataSourceField, dropPoint, container.id);
      this.status.set(
        `Campo "${dataSourceField.displayName}" agregado dentro de ${container.name}`,
      );
      return;
    }

    const type = event.dataTransfer?.getData('application/x-component-type');
    if (!type) return;
    this.store.addElement(type as ComponentType, dropPoint, container.id);
    this.status.set(`Componente agregado dentro de ${container.name ?? 'contenedor'}`);
  }

  private hasPaletteData(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    return Boolean(
      types?.includes('application/x-component-type') ||
      types?.includes('application/x-container-preset-kind') ||
      types?.includes('application/x-data-source-field'),
    );
  }

  private readDataSourceField(event: DragEvent): DataSourceField | null {
    const raw = event.dataTransfer?.getData('application/x-data-source-field');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DataSourceField;
    } catch {
      return null;
    }
  }

  select(event: PointerEvent, element: DesignComponent): void {
    event.stopPropagation();
    this.store.select(element.id);
  }

  startInteraction(event: PointerEvent, element: DesignComponent, mode: InteractionMode): void {
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

    const deltaX = (event.clientX - this.interaction.startClientX) / CSS_MM_IN_PX;
    const deltaY = (event.clientY - this.interaction.startClientY) / CSS_MM_IN_PX;

    if (this.interaction.mode === 'move') {
      this.applyMove(deltaX, deltaY);
    } else {
      this.applyResize(deltaX, deltaY);
    }

    this.status.set('Cambios sin guardar');
  }

  @HostListener('document:pointerup')
  endInteraction(): void {
    this.interaction = null;
    this.alignmentGuides.set([]);
  }

  /** Mueve el elemento con imán hacia bordes/centros y sin superponerse. */
  private applyMove(deltaX: number, deltaY: number): void {
    const interaction = this.interaction!;
    const element = this.store.selectedElement();
    if (!element) return;

    const bounds = this.store.getElementBounds(interaction.id);
    const width = interaction.initialWidth;
    const height = interaction.initialHeight;
    const maxX = Math.max(0, bounds.width - width);
    const maxY = Math.max(0, bounds.height - height);
    let x = clamp(interaction.initialX + deltaX, 0, maxX);
    let y = clamp(interaction.initialY + deltaY, 0, maxY);

    const siblings = this.store.getSiblings(interaction.id);

    // Anclas de destino: bordes y centros de hermanos, más los del lienzo.
    const verticalTargets = [0, bounds.width / 2, bounds.width];
    const horizontalTargets = [0, bounds.height / 2, bounds.height];
    for (const sibling of siblings) {
      const p = sibling.position;
      verticalTargets.push(p.x, p.x + p.width / 2, p.x + p.width);
      horizontalTargets.push(p.y, p.y + p.height / 2, p.y + p.height);
    }

    const ownVertical = [0, width / 2, width];
    const ownHorizontal = [0, height / 2, height];

    let snapV: { shift: number; line: number } | null = null;
    for (const target of verticalTargets) {
      for (const own of ownVertical) {
        const shift = target - (x + own);
        if (Math.abs(shift) <= SNAP_MM && (!snapV || Math.abs(shift) < Math.abs(snapV.shift))) {
          snapV = { shift, line: target };
        }
      }
    }

    let snapH: { shift: number; line: number } | null = null;
    for (const target of horizontalTargets) {
      for (const own of ownHorizontal) {
        const shift = target - (y + own);
        if (Math.abs(shift) <= SNAP_MM && (!snapH || Math.abs(shift) < Math.abs(snapH.shift))) {
          snapH = { shift, line: target };
        }
      }
    }

    if (snapV) x = clamp(x + snapV.shift, 0, maxX);
    if (snapH) y = clamp(y + snapH.shift, 0, maxY);

    // Sin superposición: si choca, desliza por un solo eje o se detiene.
    const collidesAt = (px: number, py: number) =>
      siblings.some((sibling) => rectsOverlap(px, py, width, height, sibling.position));
    if (collidesAt(x, y)) {
      if (!collidesAt(x, element.position.y)) {
        y = element.position.y;
        snapH = null;
      } else if (!collidesAt(element.position.x, y)) {
        x = element.position.x;
        snapV = null;
      } else {
        x = element.position.x;
        y = element.position.y;
        snapV = null;
        snapH = null;
      }
    }

    // Solo dibuja la guía si tras resolver colisiones sigue alineado.
    const offset = this.store.getParentOffset(interaction.id);
    const guides: AlignmentGuide[] = [];
    if (snapV && ownVertical.some((own) => Math.abs(x + own - snapV!.line) < 0.05)) {
      guides.push({
        orientation: 'vertical',
        positionMm: offset.x + snapV.line,
      });
    }
    if (snapH && ownHorizontal.some((own) => Math.abs(y + own - snapH!.line) < 0.05)) {
      guides.push({
        orientation: 'horizontal',
        positionMm: offset.y + snapH.line,
      });
    }
    this.alignmentGuides.set(guides);

    this.store.updatePosition(interaction.id, { x, y });
  }

  /** Redimensiona sin invadir a los hermanos. */
  private applyResize(deltaX: number, deltaY: number): void {
    const interaction = this.interaction!;
    const element = this.store.selectedElement();
    if (!element) return;

    const bounds = this.store.getElementBounds(interaction.id);
    const maxWidth = bounds.width - interaction.initialX;
    const maxHeight = bounds.height - interaction.initialY;
    let width = clamp(interaction.initialWidth + deltaX, 5, Math.max(5, maxWidth));
    let height = clamp(interaction.initialHeight + deltaY, 5, Math.max(5, maxHeight));

    const siblings = this.store.getSiblings(interaction.id);
    const x = interaction.initialX;
    const y = interaction.initialY;
    const collidesAt = (w: number, h: number) =>
      siblings.some((sibling) => rectsOverlap(x, y, w, h, sibling.position));

    if (collidesAt(width, height)) {
      if (!collidesAt(width, element.position.height)) {
        height = element.position.height;
      } else if (!collidesAt(element.position.width, height)) {
        width = element.position.width;
      } else {
        width = element.position.width;
        height = element.position.height;
      }
    }

    this.store.updatePosition(interaction.id, { width, height });
  }

  updateNumber(property: 'x' | 'y' | 'width' | 'height', event: Event): void {
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

  fixedRows(element: DesignComponent): FixedTableRow[] {
    const rows = element.content?.rows;
    return Array.isArray(rows) ? rows : [];
  }

  updateFixedRow(index: number, property: 'label' | 'dataPath', event: Event): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const value = (event.target as HTMLInputElement).value;
    this.store.updateContent(selected.id, {
      rows: this.fixedRows(selected).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [property]: value } : row,
      ),
    });
    this.status.set('Cambios sin guardar');
  }

  addFixedRow(): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    this.store.updateContent(selected.id, {
      rows: [...this.fixedRows(selected), { label: 'CONCEPTO', dataPath: '' }],
    });
    this.status.set('Fila agregada');
  }

  removeFixedRow(index: number): void {
    const selected = this.store.selectedElement();
    if (!selected) return;

    this.store.updateContent(selected.id, {
      rows: this.fixedRows(selected).filter((_, rowIndex) => rowIndex !== index),
    });
    this.status.set('Fila eliminada');
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

  updateColumn(column: TableColumn, property: 'title' | 'dataPath', event: Event): void {
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
      columns: this.tableColumns(selected).filter((item) => item.id !== column.id),
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

    this.status.set('Subiendo imagen...');
    this.store.uploadImage(file).subscribe({
      next: (response) => {
        // Obtenemos una previsualización temporal para el editor usando FileReader
        const reader = new FileReader();
        reader.onload = () => {
          this.store.updateContent(selected.id, {
            assetId: response.id,
            previewSrc: String(reader.result),
            source: 'asset',
          });
          this.status.set('Imagen cargada y guardada en el servidor');
        };
        reader.readAsDataURL(file);
      },
      error: () => {
        this.status.set('Error al subir la imagen');
      },
    });
  }

  save(): void {
    this.store.versionSaveInfo().subscribe({
      next: async ({ exists, latestVersion, nextVersion }) => {
        if (exists) {
          const confirmed = await confirmAction({
            title: 'Se creará una nueva versión',
            text:
              `La última versión de este formato es la ${latestVersion}. ` +
              `Los cambios se guardarán como versión ${nextVersion} ` +
              'y la versión actual se conservará sin cambios.',
            confirmText: `Crear versión ${nextVersion}`,
          });
          if (!confirmed) return;

          this.store.saveAsNewVersion(nextVersion).subscribe({
            next: (versionedTemplate) => {
              this.status.set(`Nueva versión ${nextVersion} guardada`);
              notifySuccess(
                `Versión ${nextVersion} creada`,
                versionedTemplate.document.name || undefined,
              );
              void this.router.navigate(['/editor', versionedTemplate.document.id], {
                replaceUrl: true,
              });
            },
            error: () => {
              this.status.set(
                `No fue posible crear la versión ${nextVersion}. Intenta nuevamente.`,
              );
            },
          });
          return;
        }

        this.store.save().subscribe({
          next: () => {
            this.status.set('Formato guardado en el servidor');
            notifySuccess('Formato guardado', this.store.template().document.name || undefined);
            const newId = this.store.template().document.id;
            void this.router.navigate(['/editor', newId], { replaceUrl: true });
          },
          error: () => {
            this.status.set('No fue posible guardar el formato.');
          },
        });
      },
      error: () => {
        this.status.set('No fue posible consultar las versiones existentes del formato.');
      },
    });
  }

  async createNew(): Promise<void> {
    const confirmed = await confirmAction({
      title: '¿Crear un formato nuevo?',
      text: 'Los cambios que no hayas guardado se perderán.',
      confirmText: 'Sí, crear nuevo',
    });
    if (!confirmed) return;

    this.store.createNew();
    this.bindings.configure(this.store.template());
    this.status.set('Borrador sin guardar');
    notifySuccess('Formato nuevo listo');
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
    notifySuccess('JSON exportado', `${template.document.name || 'plantilla'}.json`);
  }

  async remove(): Promise<void> {
    const selected = this.store.selectedElement();
    if (!selected) return;

    const confirmed = await confirmAction({
      title: '¿Eliminar componente?',
      text: `Se eliminará «${selected.name}» de la hoja.`,
      confirmText: 'Sí, eliminar',
    });
    if (!confirmed) return;

    this.store.removeSelected();
    this.status.set('Componente eliminado');
    notifySuccess('Componente eliminado');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function stripListPrefix(line: string): string {
  for (const prefix of BULLET_PREFIXES) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length);
    }
  }
  return line.replace(NUMBER_PREFIX_RE, '');
}

function formatListMarker(marker: string, index: number): string {
  if (marker === '1.' || marker.startsWith('1')) {
    return `${index + 1}.`;
  }
  if (marker === 'a.' || marker.startsWith('a')) {
    return `${String.fromCharCode(97 + (index % 26))}.`;
  }
  if (marker === 'i.' || marker.startsWith('i')) {
    return `${toRoman(index + 1)}.`;
  }
  return marker.replace(/\.$/, '') + '.';
}

function toRoman(value: number): string {
  const numerals: [number, string][] = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let remaining = value;
  let result = '';
  for (const [amount, symbol] of numerals) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }
  return result || 'i';
}
