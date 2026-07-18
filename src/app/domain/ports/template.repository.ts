import { DesignContract } from '../models/template.model';

export interface TemplateRepository {
  list(): DesignContract[];
  load(id: string): DesignContract | null;
  save(template: DesignContract): void;
  remove(id: string): void;
}
