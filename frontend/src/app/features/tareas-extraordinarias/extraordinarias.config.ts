import { CatalogDefinition } from '../../shared/catalog/catalog.model';
export const extraordinariasCatalog: CatalogDefinition = {
  endpoint: 'tareas-extraordinarias',
  path: '/inicio/mantenimiento/tareas-extraordinarias',
  parentPath: '/inicio/mantenimiento/tareas/menu',
  parentLabel: 'Tareas',
  createFromMenuOnly: true,
  title: 'Tareas extraordinarias',
  singular: 'tarea extraordinaria',
  newLabel: 'Nueva tarea extraordinaria',
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, max: 150 },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', max: 10000 },
  ],
};
