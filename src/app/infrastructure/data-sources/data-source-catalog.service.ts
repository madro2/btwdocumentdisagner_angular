import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DataSourceField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  path: string;
  dataType: string;
  cardinality: string;
  group: string;
  sortOrder: number;
}

export interface DataSourceCollection {
  id: string;
  name: string;
  description: string;
  sourceType: string;
  fields: DataSourceField[];
}

@Injectable({ providedIn: 'root' })
export class DataSourceCatalogService {
  private readonly http = inject(HttpClient);

  list(): Observable<DataSourceCollection[]> {
    return this.http.get<DataSourceCollection[]>(`${environment.apiBaseUrl}/data-sources`);
  }
}
