import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EditorStore } from '../../application/editor/editor.store';
import {
  DesignContract,
  documentKindOf,
  PAGE_SIZES,
} from '../../domain/models/template.model';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  private readonly store = inject(EditorStore);
  private readonly router = inject(Router);

  readonly query = signal('');
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
    this.store.listTemplates().subscribe(t => this.templates.set(t));
  }

  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  createBlank(): void {
    this.router.navigate(['/editor']);
  }

  open(template: DesignContract): void {
    this.router.navigate(['/editor', template.document.id]);
  }

  remove(event: Event, template: DesignContract): void {
    event.stopPropagation();
    this.store.removeTemplate(template.document.id).subscribe(() => {
      this.loadTemplates();
    });
  }

  formatLabel(template: DesignContract): string {
    return PAGE_SIZES[template.page.size].label;
  }

  isPos(template: DesignContract): boolean {
    return documentKindOf(template.page) === 'pos';
  }

  updatedLabel(template: DesignContract): string {
    return new Date(template.updatedAt ?? Date.now()).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
