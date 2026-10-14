import { Routes } from '@angular/router';
import { tareasCatalog } from '../tareas/tareas.config';
import { extraordinariasCatalog } from '../tareas-extraordinarias/extraordinarias.config';
import { planesCatalog } from '../planes/planes.config';
import { ordenesCatalog } from '../ordenes/ordenes.config';
import { MAINTENANCE_MENUS } from './maintenance-links';
export const mantenimientoRoutes: Routes = [
  ...(
    [
      ['tareas/menu', 'tareas'],
      ['maquinas', 'maquinas'],
      ['planes', 'planes'],
      ['ordenes', 'ordenes'],
    ] as const
  ).map(([path, key]) => ({
    path,
    pathMatch: 'full' as const,
    data: { menu: MAINTENANCE_MENUS[key] },
    loadComponent: () => import('./maintenance-menu').then((m) => m.MaintenanceMenuComponent),
  })),
  {
    path: 'registrar-tarea',
    loadComponent: () =>
      import('../registros/registrar-tarea').then((m) => m.RegistrarTareaComponent),
  },
  {
    path: 'registros',
    loadComponent: () =>
      import('../registros/registros-list').then((m) => m.RegistrosListComponent),
  },
  {
    path: 'registros/:id',
    loadComponent: () =>
      import('../registros/registro-detail').then((m) => m.RegistroDetailComponent),
  },
  {
    path: 'ordenes/listado',
    loadComponent: () => import('../ordenes/ordenes-list').then((m) => m.OrdenesListComponent),
  },
  ...['ordenes/nueva', 'ordenes/:id/editar'].map((path) => ({
    path,
    data: { catalog: ordenesCatalog, mode: 'form' },
    loadComponent: () =>
      import('../../shared/catalog/catalog-page').then((m) => m.CatalogPageComponent),
  })),
  ...(['preventivos', 'predictivos'] as const).flatMap((type) =>
    ['', '/nueva', '/:id/editar'].map((suffix) => ({
      path: 'planes/' + type + suffix,
      data: { catalog: planesCatalog(type), mode: suffix ? 'form' : 'list' },
      loadComponent: () =>
        import('../../shared/catalog/catalog-page').then((m) => m.CatalogPageComponent),
    })),
  ),
  ...[
    'tareas-extraordinarias',
    'tareas-extraordinarias/nueva',
    'tareas-extraordinarias/:id/editar',
  ].map((path) => ({
    path,
    data: {
      catalog: extraordinariasCatalog,
      mode: path === 'tareas-extraordinarias' ? 'list' : 'form',
    },
    loadComponent: () =>
      import('../../shared/catalog/catalog-page').then((m) => m.CatalogPageComponent),
  })),
  ...['tareas', 'tareas/nueva', 'tareas/:id/editar'].map((path) => ({
    path,
    data: { catalog: tareasCatalog, mode: path === 'tareas' ? 'list' : 'form' },
    loadComponent: () =>
      import('../../shared/catalog/catalog-page').then((m) => m.CatalogPageComponent),
  })),
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('../inicio/module-page').then((m) => m.ModulePageComponent),
  },
  {
    path: 'maquinas/listado',
    loadComponent: () => import('../maquinas/maquinas-list').then((m) => m.MaquinasListComponent),
  },
  {
    path: 'maquinas/baja',
    data: { baja: true },
    loadComponent: () => import('../maquinas/maquinas-list').then((m) => m.MaquinasListComponent),
  },
  {
    path: 'maquinas/nueva',
    loadComponent: () => import('../maquinas/maquina-form').then((m) => m.MaquinaFormComponent),
  },
  {
    path: 'maquinas/:id/editar',
    loadComponent: () => import('../maquinas/maquina-form').then((m) => m.MaquinaFormComponent),
  },
  {
    path: 'horometro',
    loadComponent: () => import('../maquinas/horometro').then((m) => m.HorometroComponent),
  },
  {
    path: 'repuestos',
    loadComponent: () =>
      import('../repuestos-inventario/repuestos-list').then((m) => m.RepuestosListComponent),
  },
  {
    path: 'repuestos/nuevo',
    loadComponent: () =>
      import('../repuestos-inventario/repuesto-form').then((m) => m.RepuestoFormComponent),
  },
  {
    path: 'repuestos/:id/editar',
    loadComponent: () =>
      import('../repuestos-inventario/repuesto-form').then((m) => m.RepuestoFormComponent),
  },
];
