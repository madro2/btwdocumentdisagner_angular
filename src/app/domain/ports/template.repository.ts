import { Observable } from 'rxjs';
import { DesignContract } from '../models/template.model';

export interface TemplateRepository {
  list(): Observable<DesignContract[]>;
  load(id: string): Observable<DesignContract | null>;
  save(template: DesignContract): Observable<void>;
  update(id: string, template: DesignContract): Observable<void>;
  remove(id: string): Observable<void>;
}
