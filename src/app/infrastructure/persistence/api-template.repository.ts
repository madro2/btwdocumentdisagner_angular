import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DesignContract } from '../../domain/models/template.model';
import { TemplateRepository } from '../../domain/ports/template.repository';
import { environment } from '../../../environments/environment';

export interface PdfDesignTemplateDto {
  id: string;
  documentType: string;
  designName: string;
  designVersion: number;
  jsonConfiguration: string;
  creationDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiTemplateRepository implements TemplateRepository {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/Designs`;

  list(): Observable<DesignContract[]> {
    return this.http.get<PdfDesignTemplateDto[]>(this.apiUrl).pipe(
      map(dtos => dtos
        .map(dto => {
          try {
            return dto.jsonConfiguration ? (JSON.parse(dto.jsonConfiguration) as DesignContract) : null;
          } catch { return null; }
        })
        .filter((contract): contract is DesignContract => contract !== null)
      )
    );
  }

  load(id: string): Observable<DesignContract | null> {
    return this.http.get<PdfDesignTemplateDto>(`${this.apiUrl}/${id}`).pipe(
      map(dto => {
        try {
          return dto && dto.jsonConfiguration ? (JSON.parse(dto.jsonConfiguration) as DesignContract) : null;
        } catch { return null; }
      })
    );
  }

  save(template: DesignContract): Observable<void> {
    const payload: PdfDesignTemplateDto = {
      id: template.document.id,
      documentType: template.document.type || 'document',
      designName: template.document.name || 'Unnamed',
      designVersion: template.document.version || 1,
      jsonConfiguration: JSON.stringify(template),
      creationDate: new Date().toISOString()
    };
    return this.http.post<void>(this.apiUrl, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
