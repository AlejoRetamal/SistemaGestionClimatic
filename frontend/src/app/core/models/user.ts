export type Role = 'Direccion' | 'Administracion' | 'Mantenimiento' | 'Produccion';
export type ModuleKey = 'administracion' | 'produccion' | 'mantenimiento' | 'comercial';
export interface User {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string | null;
  grupo: Role;
  modulos: ModuleKey[];
}
export interface ModuleStatus {
  modulo: ModuleKey;
  estado: string;
  mensaje: string;
}
