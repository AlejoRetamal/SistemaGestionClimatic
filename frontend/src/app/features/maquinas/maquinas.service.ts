import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Maquina, MaquinaInput } from './maquina.model';
@Injectable({ providedIn: 'root' })
export class MaquinasService {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<Maquina[]>('/api/maquinas');
  }
  get(id: number) {
    return this.http.get<Maquina>(`/api/maquinas/${id}`);
  }
  create(data: MaquinaInput) {
    return this.http.post<Maquina>('/api/maquinas', data);
  }
  update(id: number, data: MaquinaInput) {
    return this.http.put<Maquina>(`/api/maquinas/${id}`, data);
  }
  deactivate(id: number) {
    return this.http.patch<Maquina>(`/api/maquinas/${id}/baja`, {});
  }
  meter(id: number, horas: number, horas_esperadas: number, confirmar_reduccion: boolean) {
    return this.http.patch<Maquina>(`/api/maquinas/${id}/horometro`, {
      horas,
      horas_esperadas,
      confirmar_reduccion,
    });
  }
}
