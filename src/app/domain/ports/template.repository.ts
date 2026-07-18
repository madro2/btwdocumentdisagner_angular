import { PdfTemplate } from '../models/template.model';

export interface TemplateRepository {
  save(template: PdfTemplate): void;
  load(): PdfTemplate | null;
}
