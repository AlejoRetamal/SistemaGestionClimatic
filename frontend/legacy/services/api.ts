import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // AUTH
  login(pin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { pin });
  }

  // EMPLEADOS
  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleados`);
  }

  getEmpleado(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleados/${id}`);
  }

  createEmpleado(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleados`, data);
  }

  updateEmpleado(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleados/${id}`, data);
  }

  deleteEmpleado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/empleados/${id}`);
  }

  // MÁQUINAS
  getMaquinas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/maquinas`);
  }

  getMaquina(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/maquinas/${id}`);
  }

  createMaquina(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/maquinas`, data);
  }

  updateMaquina(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/maquinas/${id}`, data);
  }

  deleteMaquina(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/maquinas/${id}`);
  }

  updateHoras(id: number, horas: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/maquinas/${id}/horas`, { horas });
  }

  // REPUESTOS
  getRepuestos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/repuestos`);
  }

  getRepuesto(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/repuestos/${id}`);
  }

  createRepuesto(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/repuestos`, data);
  }

  updateRepuesto(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/repuestos/${id}`, data);
  }

  deleteRepuesto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/repuestos/${id}`);
  }

    // PROVEEDORES
  getProveedores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proveedores`);
  }

  getProveedor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/proveedores/${id}`);
  }

  createProveedor(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/proveedores`, data);
  }

  updateProveedor(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/proveedores/${id}`, data);
  }

  deleteProveedor(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/proveedores/${id}`);
  }

  // TAREAS
  getTareas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tareas`);
  }

  getTarea(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tareas/${id}`);
  }

  createTarea(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tareas`, data);
  }

  updateTarea(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tareas/${id}`, data);
  }

  deleteTarea(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tareas/${id}`);
  }

    // PLANES DE MANTENIMIENTO
  getPlanes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/planes`);
  }

  getPlan(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/planes/${id}`);
  }

  getPlanByTipo(tipo: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/planes/tipo/${tipo}`);
  }

  createPlan(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/planes`, data);
  }

  updatePlan(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/planes/${id}`, data);
  }

  deletePlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/planes/${id}`);
  }

  // ÓRDENES DE MANTENIMIENTO
  getOrdenes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ordenes`);
  }

  getOrdenesActivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ordenes/activas`);
  }

  getOrden(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ordenes/${id}`);
  }

  createOrden(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ordenes`, data);
  }

  updateOrden(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ordenes/${id}`, data);
  }

  cerrarOrden(id: number, empleado_id_cierre: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/ordenes/${id}/cerrar`, { empleado_id_cierre });
  }

  deleteOrden(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ordenes/${id}`);
  }
}