import { inject, Injectable, signal } from '@angular/core';
import { A4_PORTRAIT, PdfTemplate } from '../../domain/models/template.model';
import { TEMPLATE_REPOSITORY } from '../tokens/template-repository.token';

/**
 * Estado del editor.
 * Esqueleto: sin operaciones de UI (agregar, seleccionar, mover, etc.).
 */
@Injectable({ providedIn: 'root' })
export class EditorStore {
  private readonly repository = inject(TEMPLATE_REPOSITORY);
  private readonly templateState = signal<PdfTemplate>(this.emptyTemplate());

  readonly template = this.templateState.asReadonly();

  createNew(): void {
    this.templateState.set(this.emptyTemplate());
  }

  save(): void {
    this.repository.save(this.templateState());
  }

  load(): boolean {
    const template = this.repository.load();
    if (!template) {
      return false;
    }

    this.templateState.set(template);
    return true;
  }

  private emptyTemplate(): PdfTemplate {
    return {
      schemaVersion: '1.0',
      name: '',
      page: { ...A4_PORTRAIT },
      elements: [],
    };
  }
}
