import { CatalogDefinition } from '../../shared/catalog/catalog.model';
export function planesCatalog(type: 'preventivos' | 'predictivos'): CatalogDefinition {
  return {
    endpoint: 'planes/' + type,
    path: '/inicio/mantenimiento/planes/' + type,
    title: 'Planes ' + type,
    singular: 'plan',
    newLabel: 'Nuevo plan',
    description:
      'Frecuencias expresadas en horas. El estado Próximo usa el margen de horas indicado en la tabla. Los cálculos provienen de la vista de servicios existente.',
    links: [
      { label: 'Preventivos', path: '/inicio/mantenimiento/planes/preventivos' },
      { label: 'Predictivos', path: '/inicio/mantenimiento/planes/predictivos' },
    ],
    columns: [
      { key: 'tarea_nombre', label: 'Tarea' },
      { key: 'maquina_nombre', label: 'Máquina' },
      { key: 'frecuencia', label: 'Frecuencia (h)' },
      { key: 'horometro_actual', label: 'Horómetro actual' },
      { key: 'ultimo_horometro', label: 'Último horómetro' },
      { key: 'ultima_fecha_ejecucion', label: 'Última ejecución' },
      { key: 'proximo_servicio', label: 'Próximo servicio' },
      { key: 'horas_restantes', label: 'Horas restantes' },
      { key: 'margen_horas', label: 'Margen próximo (h)' },
      { key: 'estado', label: 'Estado' },
    ],
    fields: [
      { key: 'tarea_id', label: 'Tarea', type: 'select', lookup: 'tareas', required: true },
      {
        key: 'frecuencia',
        label: 'Frecuencia (horas)',
        type: 'number',
        required: true,
        min: 0.01,
        max: 9999999999.99,
      },
    ],
  };
}
