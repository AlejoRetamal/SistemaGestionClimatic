export interface Orden {
  id: number;
  fecha_creacion: string;
  empleado_id: number;
  empleado_nombre: string;
  descripcion: string;
  maquina_id: number;
  maquina_nombre: string;
  activo: number;
  fecha_cierre: string | null;
}
