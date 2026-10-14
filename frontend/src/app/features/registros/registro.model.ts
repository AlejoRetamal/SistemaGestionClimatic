export interface Consumo {
  repuesto_id: number;
  cantidad: number;
}
export interface RegistroInput {
  tarea_id: number;
  medicion_horometro: number;
  duracion_inicio: string;
  duracion_fin: string;
  orden_mantenimiento_id: number | null;
  repuestos: Consumo[];
  confirmar_reduccion: boolean;
  horas_esperadas: number;
}
export interface Registro {
  id: number;
  fecha: string | null;
  operario_id: number;
  operario_nombre: string;
  tarea_id: number;
  tarea_nombre: string;
  maquina_id: number;
  maquina_nombre: string;
  origen: string;
  medicion_horometro: number | null;
  duracion_inicio: string | null;
  duracion_fin: string | null;
  orden_mantenimiento_id: number | null;
  orden_descripcion: string | null;
}
export interface RegistroDetalle extends Registro {
  repuestos: (Consumo & { repuesto_nombre: string })[];
}
