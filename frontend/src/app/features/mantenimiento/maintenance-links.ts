export const MAINTENANCE_LINKS: { title: string; detail: string; path?: string }[] = [
  {
    title: 'Historial de trabajos',
    detail: 'Consultar ejecuciones y repuestos utilizados.',
    path: '/inicio/mantenimiento/registros',
  },
  {
    title: 'Registrar tarea',
    detail: 'Registrar la ejecución de una tarea definida.',
    path: '/inicio/mantenimiento/registrar-tarea',
  },
  {
    title: 'Registrar tarea extraordinaria',
    path: '/inicio/mantenimiento/registrar-tarea-extraordinaria',
    detail: 'Registrar un trabajo extraordinario realizado.',
  },
  {
    title: 'Alta de tarea',
    detail: 'Crear la definición de una tarea de mantenimiento.',
    path: '/inicio/mantenimiento/tareas/nueva',
  },
  {
    title: 'Consultar tareas',
    detail: 'Editar las definiciones de tareas existentes.',
    path: '/inicio/mantenimiento/tareas',
  },
  {
    title: 'Alta de tarea extraordinaria',
    detail: 'Definir un trabajo extraordinario.',
    path: '/inicio/mantenimiento/tareas-extraordinarias/nueva',
  },
  {
    title: 'Consultar tareas extraordinarias',
    detail: 'Editar definiciones de trabajos extraordinarios.',
    path: '/inicio/mantenimiento/tareas-extraordinarias',
  },
  {
    title: 'Máquinas',
    detail: 'Consultar y gestionar equipos.',
    path: '/inicio/mantenimiento/maquinas',
  },
  {
    title: 'Actualizar horómetro',
    detail: 'Actualizar manualmente las horas de una máquina.',
    path: '/inicio/mantenimiento/horometro',
  },
  {
    title: 'Órdenes de mantenimiento',
    detail: 'Consultar solicitudes de trabajo.',
    path: '/inicio/mantenimiento/ordenes',
  },
  {
    title: 'Planes preventivos / predictivos',
    path: '/inicio/mantenimiento/planes',
    detail: 'Consultar servicios según las horas de uso.',
  },
  {
    title: 'Repuestos / Inventario',
    detail: 'Consultar repuestos compatibles y existencias.',
    path: '/inicio/mantenimiento/repuestos',
  },
];
