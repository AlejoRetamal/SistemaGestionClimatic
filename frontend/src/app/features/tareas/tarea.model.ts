export interface Tarea {
  id: number;
  nombre: string;
  descripcion: string | null;
  maquina_id: number;
  maquina_nombre: string;
  horas_parada: number | null;
  corte_tension: 'Si' | 'No' | 'Total' | 'Parcial' | null;
}
export type TareaInput = Omit<Tarea, 'id' | 'maquina_nombre'>;
