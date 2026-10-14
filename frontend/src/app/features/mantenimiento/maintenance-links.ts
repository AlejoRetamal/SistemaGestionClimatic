export interface MaintenanceLink {
  title: string;
  detail: string;
  path: string;
}
export interface MaintenanceMenu {
  title: string;
  detail: string;
  links: MaintenanceLink[];
}
const base = '/inicio/mantenimiento';
export const MAINTENANCE_LINKS: MaintenanceLink[] = [
  {
    title: 'Registro de tareas programadas',
    detail: 'Registrar trabajos realizados y consultar su historial.',
    path: base + '/registros/menu',
  },
  {
    title: 'Tareas',
    detail: 'Altas y consulta de tareas comunes y extraordinarias.',
    path: base + '/tareas/menu',
  },
  {
    title: 'Planes de mantenimiento',
    detail: 'Altas y listado de planes preventivos y predictivos.',
    path: base + '/planes',
  },
  {
    title: 'Repuestos / Inventario',
    detail: 'Gestionar repuestos, proveedores y existencias en un mismo lugar.',
    path: base + '/repuestos',
  },
  {
    title: 'Órdenes de mantenimiento',
    detail: 'Consultar órdenes o crear una nueva.',
    path: base + '/ordenes',
  },
  { title: 'Máquinas', detail: 'Alta, baja y listado de máquinas.', path: base + '/maquinas' },
];
export const MAINTENANCE_MENUS: Record<
  'registros' | 'tareas' | 'maquinas' | 'planes' | 'ordenes',
  MaintenanceMenu
> = {
  registros: {
    title: 'Registro de tareas programadas',
    detail: 'Consultá el historial o registrá un trabajo realizado.',
    links: [
      {
        title: 'Ver historial',
        detail: 'Consultar los trabajos realizados y sus detalles.',
        path: base + '/registros',
      },
      {
        title: 'Registrar una tarea',
        detail: 'Registrar un trabajo realizado y los repuestos utilizados.',
        path: base + '/registrar-tarea',
      },
    ],
  },
  tareas: {
    title: 'Tareas',
    detail: 'Elegí qué tipo de tarea querés crear o consultar.',
    links: [
      {
        title: 'Alta de tarea común',
        detail: 'Definir una tarea asociada a una máquina.',
        path: base + '/tareas/nueva',
      },
      {
        title: 'Alta de tarea extraordinaria',
        detail: 'Definir un trabajo extraordinario.',
        path: base + '/tareas-extraordinarias/nueva',
      },
      {
        title: 'Listado de tareas comunes',
        detail: 'Consultar y editar las tareas existentes.',
        path: base + '/tareas',
      },
      {
        title: 'Listado de tareas extraordinarias',
        detail: 'Consultar y editar las definiciones extraordinarias.',
        path: base + '/tareas-extraordinarias',
      },
    ],
  },
  maquinas: {
    title: 'Máquinas',
    detail: 'Elegí la operación que querés realizar.',
    links: [
      {
        title: 'Alta de máquinas',
        detail: 'Incorporar una nueva máquina.',
        path: base + '/maquinas/nueva',
      },
      {
        title: 'Baja de máquinas',
        detail: 'Dar de baja una máquina activa conservando su historial.',
        path: base + '/maquinas/baja',
      },
      {
        title: 'Listado de máquinas',
        detail: 'Consultar equipos, editar sus datos y actualizar el horómetro.',
        path: base + '/maquinas/listado',
      },
    ],
  },
  planes: {
    title: 'Planes de mantenimiento',
    detail: 'Gestioná las frecuencias de los servicios.',
    links: [
      {
        title: 'Alta de planes preventivos',
        detail: 'Programar mantenimiento preventivo por horas.',
        path: base + '/planes/preventivos/nueva',
      },
      {
        title: 'Alta de planes predictivos',
        detail: 'Programar mantenimiento predictivo por horas.',
        path: base + '/planes/predictivos/nueva',
      },
      {
        title: 'Listado de planes',
        detail: 'Consultar planes preventivos y predictivos y sus próximos servicios.',
        path: base + '/planes/preventivos',
      },
    ],
  },
  ordenes: {
    title: 'Órdenes de mantenimiento',
    detail: 'Consultá las órdenes existentes o creá una solicitud de trabajo.',
    links: [
      {
        title: 'Consultar órdenes',
        detail: 'Consultar, editar y cerrar órdenes de mantenimiento.',
        path: base + '/ordenes/listado',
      },
      {
        title: 'Nueva orden',
        detail: 'Crear una solicitud para una máquina.',
        path: base + '/ordenes/nueva',
      },
    ],
  },
};
