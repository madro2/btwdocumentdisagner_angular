import { Injectable } from '@angular/core';
import { PdfTemplate } from '../../domain/models/template.model';
import { TemplateRepository } from '../../domain/ports/template.repository';

/**
 * Adaptador local (localStorage).
 * Esqueleto: sin lógica de persistencia aún.
 */
@Injectable()
export class LocalTemplateRepository implements TemplateRepository {
  save(_template: PdfTemplate): void {
    // Pendiente: persistir borrador en localStorage.
  }

  load(): PdfTemplate | null {
    // Pendiente: recuperar borrador desde localStorage.
    return null;
  }
}
