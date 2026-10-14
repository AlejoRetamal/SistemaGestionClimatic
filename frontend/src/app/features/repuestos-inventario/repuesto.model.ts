export type Prioridad = 'Rojo' | 'Amarillo' | 'Verde';
export interface Proveedor {
  id: number;
  nombre: string;
}
export interface RepuestoInput {
  nombre: string;
  maquina_id: number;
  descripcion: string | null;
  observaciones: string | null;
  foto: string | null;
  prioritario: Prioridad | null;
  proveedores: number[];
}
export interface Repuesto extends Omit<RepuestoInput, 'proveedores'> {
  id: number;
  maquina_nombre: string;
  cantidad_actual: number;
  cantidad_minima: number;
}
export interface RepuestoDetalle extends Repuesto {
  proveedores: number[];
}
export function stockState(part: Pick<Repuesto, 'cantidad_actual' | 'cantidad_minima'>): Prioridad {
  return part.cantidad_actual <= part.cantidad_minima
    ? 'Rojo'
    : part.cantidad_actual <= part.cantidad_minima * 1.25
      ? 'Amarillo'
      : 'Verde';
}
