import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Orden } from './orden.model';
@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<Orden[]>('/api/ordenes-mantenimiento');
  }
  close(id: number) {
    return this.http.patch<Orden>(`/api/ordenes-mantenimiento/${id}/cerrar`, {});
  }
}
