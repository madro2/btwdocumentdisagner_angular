import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EditorStore } from '../../application/editor/editor.store';
import {
  DesignContract,
  documentKindOf,
  PAGE_SIZES,
  PageOrientation,
  PageSize,
} from '../../domain/models/template.model';
import { confirmAction, notifySuccess } from '../shared/alerts';

interface StarterTemplate {
  label: string;
  size: PageSize;
  orientation?: PageOrientation;
  preset?: 'standard-invoice';
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  private readonly store = inject(EditorStore);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly view = signal<'list' | 'grid'>('list');

  readonly starters: StarterTemplate[] = [
    {
      label: 'Factura electrónica',
      size: 'A4',
      preset: 'standard-invoice',
    },
    { label: 'Documento A4', size: 'A4' },
    { label: 'A4 horizontal', size: 'A4', orientation: 'landscape' },
    { label: 'Carta', size: 'LETTER' },
    { label: 'Oficio', size: 'LEGAL' },
    { label: 'Tirilla POS 80 mm', size: 'POS80' },
    { label: 'Tirilla POS 58 mm', size: 'POS58' },
  ];
  readonly templates = signal<DesignContract[]>([]);
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.templates();
    return this.templates().filter((template) =>
      template.document.name.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.store.listTemplates().subscribe((t) => this.templates.set(t));
  }

  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  setView(view: 'list' | 'grid'): void {
    this.view.set(view);
  }

  createBlank(): void {
    this.router.navigate(['/editor']);
  }

  openElectronicDocumentDemo(): void {
    this.router.navigate(['/demo']);
  }

  createFrom(starter: StarterTemplate): void {
    this.router.navigate(['/editor'], {
      queryParams: {
        size: starter.size,
        ...(starter.orientation ? { orientation: starter.orientation } : {}),
        ...(starter.preset ? { preset: starter.preset } : {}),
      },
    });
  }

  /** Tamaño en px de la miniatura, escalada para caber dentro del marco. */
  starterDims(starter: Pick<StarterTemplate, 'size' | 'orientation'>): {
    width: number;
    height: number;
  } {
    const def = PAGE_SIZES[starter.size];
    const landscape = starter.orientation === 'landscape';
    const widthMm = landscape ? def.heightMm : def.widthMm;
    const heightMm = landscape ? def.widthMm : def.heightMm;

    // Área útil del marco: 104 × 126 px (150 px de alto menos padding).
    const scale = Math.min(104 / widthMm, 126 / heightMm);
    return { width: widthMm * scale, height: heightMm * scale };
  }

  isStarterPos(starter: StarterTemplate): boolean {
    return PAGE_SIZES[starter.size].kind === 'pos';
  }

  open(template: DesignContract): void {
    this.router.navigate(['/editor', template.document.id]);
  }

  async remove(event: Event, template: DesignContract): Promise<void> {
    event.stopPropagation();

    const confirmed = await confirmAction({
      title: '¿Eliminar formato?',
      text: `«${template.document.name || 'Sin título'}» se eliminará definitivamente.`,
      confirmText: 'Sí, eliminar',
    });
    if (!confirmed) return;

    this.store.removeTemplate(template.document.id).subscribe(() => {
      this.loadTemplates();
      notifySuccess('Formato eliminado');
    });
  }

  formatLabel(template: DesignContract): string {
    return PAGE_SIZES[template.page.size].label;
  }

  isPos(template: DesignContract): boolean {
    return documentKindOf(template.page) === 'pos';
  }

  /** Fecha estilo Office: «hoy a las 12:12», «sáb a las 12:12», «12 jun 2026». */
  updatedLabel(template: DesignContract): string {
    const date = new Date(template.updatedAt ?? Date.now());
    const time = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const startOfDay = (value: Date) =>
      new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const dayMs = 86_400_000;
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / dayMs);

    if (diffDays <= 0) return `hoy a las ${time}`;
    if (diffDays === 1) return `ayer a las ${time}`;
    if (diffDays < 7) {
      const weekday = date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
      return `${weekday} a las ${time}`;
    }
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
