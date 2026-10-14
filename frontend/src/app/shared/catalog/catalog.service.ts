import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { CatalogOption, CatalogRow, FieldValue } from './catalog.model';
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  list(endpoint: string) {
    return this.http.get<CatalogRow[]>(`/api/${endpoint}`);
  }
  get(endpoint: string, id: number) {
    return this.http.get<CatalogRow>(`/api/${endpoint}/${id}`);
  }
  create(endpoint: string, data: Record<string, FieldValue>) {
    return this.http.post<CatalogRow>(`/api/${endpoint}`, data);
  }
  update(endpoint: string, id: number, data: Record<string, FieldValue>) {
    return this.http.put<CatalogRow>(`/api/${endpoint}/${id}`, data);
  }
  remove(endpoint: string, id: number) {
    return this.http.delete<void>(`/api/${endpoint}/${id}`);
  }
  options(endpoint: 'maquinas' | 'tareas') {
    return this.http
      .get<{ id: number; nombre: string; maquina_nombre?: string }[]>(`/api/${endpoint}`)
      .pipe(
        map((rows) =>
          rows.map(
            (row) =>
              ({
                value: row.id,
                label: row.nombre + (row.maquina_nombre ? ' · ' + row.maquina_nombre : ''),
              }) satisfies CatalogOption,
          ),
        ),
      );
  }
}
