import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Registro, RegistroDetalle, RegistroInput } from './registro.model';
import { Tarea } from '../tareas/tarea.model';
@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private readonly http = inject(HttpClient);
  list() {
    return this.http.get<Registro[]>('/api/registros');
  }
  get(id: number) {
    return this.http.get<RegistroDetalle>(`/api/registros/${id}`);
  }
  create(data: RegistroInput) {
    return this.http.post<RegistroDetalle>('/api/registros', data);
  }
  tasks() {
    return this.http.get<Tarea[]>('/api/tareas');
  }
}
