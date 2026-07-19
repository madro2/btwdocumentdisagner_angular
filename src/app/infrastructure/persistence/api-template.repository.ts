import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DesignContract } from '../../domain/models/template.model';
import { TemplateRepository } from '../../domain/ports/template.repository';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiTemplateRepository implements TemplateRepository {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/Designs`;

  list(): Observable<DesignContract[]> {
    return this.http.get<DesignContract[]>(this.apiUrl);
  }

  load(id: string): Observable<DesignContract | null> {
    return this.http.get<DesignContract>(`${this.apiUrl}/${id}`);
  }

  save(template: DesignContract): Observable<void> {
    return this.http.post<void>(this.apiUrl, template);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
