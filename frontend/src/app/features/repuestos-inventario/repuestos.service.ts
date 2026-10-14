import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Proveedor, Repuesto, RepuestoDetalle, RepuestoInput } from './repuesto.model';
@Injectable({ providedIn: 'root' })
export class RepuestosService {
  private readonly http = inject(HttpClient);
  list(machineId?: number) {
    return this.http.get<Repuesto[]>('/api/repuestos', {
      params:
        machineId === undefined ? new HttpParams() : new HttpParams().set('maquina_id', machineId),
    });
  }
  get(id: number) {
    return this.http.get<RepuestoDetalle>(`/api/repuestos/${id}`);
  }
  create(data: RepuestoInput) {
    return this.http.post<RepuestoDetalle>('/api/repuestos', data);
  }
  update(id: number, data: RepuestoInput) {
    return this.http.put<RepuestoDetalle>(`/api/repuestos/${id}`, data);
  }
  remove(id: number) {
    return this.http.delete<void>(`/api/repuestos/${id}`);
  }
  providers() {
    return this.http.get<Proveedor[]>('/api/proveedores');
  }
  addStock(id: number, cantidad: number) {
    return this.http.patch<Repuesto>(`/api/inventario/${id}/agregar-stock`, { cantidad });
  }
  minimum(id: number, cantidad_minima: number) {
    return this.http.patch<Repuesto>(`/api/inventario/${id}/minimo`, { cantidad_minima });
  }
}
