export interface Maquina {
  id: number;
  nombre: string;
  nombre_corto: string | null;
  potencia_instalada: number | null;
  potencia_demandada: number | null;
  horas: number;
  fecha_alta: string;
  status: 'Activo' | 'No Activo';
  fecha_baja: string | null;
  observaciones: string | null;
}
export interface MaquinaInput {
  nombre: string;
  nombre_corto: string | null;
  potencia_instalada: number | null;
  potencia_demandada: number | null;
  observaciones: string | null;
}
