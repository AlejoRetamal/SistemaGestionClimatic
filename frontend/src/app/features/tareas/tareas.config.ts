import { CatalogDefinition } from '../../shared/catalog/catalog.model';
export const tareasCatalog: CatalogDefinition = {
  endpoint: 'tareas',
  path: '/inicio/mantenimiento/tareas',
  parentPath: '/inicio/mantenimiento/tareas/menu',
  parentLabel: 'Tareas',
  createFromMenuOnly: true,
  title: 'Tareas de mantenimiento',
  singular: 'tarea',
  newLabel: 'Nueva tarea',
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'maquina_nombre', label: 'Máquina' },
    { key: 'horas_parada', label: 'Horas de parada' },
    { key: 'corte_tension', label: 'Corte de tensión' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, max: 150 },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', max: 10000 },
    { key: 'maquina_id', label: 'Máquina', type: 'select', lookup: 'maquinas', required: true },
    { key: 'horas_parada', label: 'Horas de parada', type: 'number', max: 9999.99 },
    {
      key: 'corte_tension',
      label: 'Corte de tensión',
      type: 'select',
      options: ['Si', 'No', 'Total', 'Parcial'].map((value) => ({ value, label: value })),
    },
  ],
};
