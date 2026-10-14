export interface Plan {
  id: number;
  tipo: 'Preventivo' | 'Predictivo';
  tarea_id: number;
  tarea_nombre: string;
  maquina_nombre: string;
  frecuencia: number;
  ultimo_horometro: number | null;
  ultima_fecha_ejecucion: string | null;
  proximo_servicio: number;
  horometro_actual: number;
  horas_restantes: number;
  margen_horas: number;
  estado: 'VENCIDO' | 'PRÓXIMO' | 'OK';
}
