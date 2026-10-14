import { CatalogDefinition } from '../../shared/catalog/catalog.model';
export const ordenesCatalog: CatalogDefinition = {
  endpoint: 'ordenes-mantenimiento',
  path: '/inicio/mantenimiento/ordenes/listado',
  parentPath: '/inicio/mantenimiento/ordenes',
  parentLabel: 'Órdenes de mantenimiento',
  createFromMenuOnly: true,
  title: 'Órdenes de mantenimiento',
  singular: 'orden',
  newLabel: 'Nueva orden',
  columns: [],
  fields: [
    { key: 'descripcion', label: 'Descripción', type: 'textarea', required: true, max: 10000 },
    { key: 'maquina_id', label: 'Máquina', type: 'select', lookup: 'maquinas', required: true },
  ],
};
