# Mantenimiento sobre PostgreSQL/Supabase y MySQL local

## Estructura reutilizada

Se mantienen shell, navbar, estilos, login, `AuthService`, interceptor, cookies y guards. Los nuevos componentes standalone utilizan Reactive Forms y servicios HTTP. `shared/catalog` comparte listado/formulario entre tareas, definiciones extraordinarias y planes; la configuración describe los campos y los endpoints. Las operaciones de negocio tienen componentes y servicios específicos.

El backend mantiene rutas → controladores → servicios. `config/mysql-db.js` administra el pool operativo y las transacciones; es independiente del repositorio de empleados que autentica mediante lecturas. Las consultas usan parámetros. Los únicos nombres de tabla interpolados provienen de una lista interna cerrada para preventivos/predictivos.

## Rutas Angular

Todas están bajo `/inicio/mantenimiento` y heredan los guards de autenticación y permiso de mantenimiento.

| Pantalla                       | Ruta relativa                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Máquinas                       | `maquinas` (menú), `maquinas/nueva`, `maquinas/baja`, `maquinas/listado`, `maquinas/:id/editar`          |
| Horómetro manual               | `horometro`                                                                                              |
| Repuestos e inventario         | `repuestos`, `repuestos/nuevo`, `repuestos/:id/editar`                                                   |
| Tareas                         | `tareas/menu` (altas y consultas comunes/extraordinarias), `tareas`, `tareas/nueva`, `tareas/:id/editar` |
| Definiciones extraordinarias   | `tareas-extraordinarias`, `tareas-extraordinarias/nueva`, `tareas-extraordinarias/:id/editar`            |
| Planes                         | `planes` (menú); `planes/preventivos` y `planes/predictivos` tienen listado, `nueva` y `:id/editar`      |
| Órdenes                        | `ordenes` (menú), `ordenes/listado`, `ordenes/nueva`, `ordenes/:id/editar`                               |
| Historial                      | `registros`, `registros/:id`                                                                             |
| Registro de tareas programadas | `registrar-tarea`, con acceso al historial                                                               |

El menú principal tiene seis accesos: Registro de tareas programadas, Tareas, Planes de mantenimiento, Repuestos / Inventario, Órdenes de mantenimiento y Máquinas. La baja de máquinas muestra únicamente equipos activos y conserva la confirmación. El horómetro se accede desde el listado de máquinas. Se retiró la ruta de registro extraordinario; no hay un registro de insumos independiente. Los consumos siguen formando parte del registro de trabajo. Los listados muestran nombres; los identificadores quedan para las relaciones y las URLs.

## API

Todas las rutas siguientes requieren sesión y permiso de mantenimiento; las mutaciones requieren además `X-CSRF-Token`. Los tres roles habilitados para el módulo mantienen el mismo acceso.

| Recurso         | Endpoints bajo `/api`                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Máquinas        | GET/POST `/maquinas`; GET/PUT `/maquinas/:id`; PATCH `/maquinas/:id/baja`; PATCH `/maquinas/:id/horometro`                                                     |
| Repuestos       | GET/POST `/repuestos`; GET/PUT/DELETE `/repuestos/:id`; filtro opcional `?maquina_id=...`                                                                      |
| Proveedores     | GET `/proveedores`                                                                                                                                             |
| Inventario      | GET `/inventario`; PATCH `/inventario/:id/agregar-stock` con `{cantidad}`; PATCH `/inventario/:id/minimo` con `{cantidad_minima}`; `id` identifica al repuesto |
| Tareas          | GET/POST `/tareas`; GET/PUT/DELETE `/tareas/:id`                                                                                                               |
| Extraordinarias | GET/POST `/tareas-extraordinarias`; GET/PUT/DELETE `/tareas-extraordinarias/:id`                                                                               |
| Preventivos     | GET/POST `/planes/preventivos`; GET/PUT/DELETE `/planes/preventivos/:id`                                                                                       |
| Predictivos     | GET/POST `/planes/predictivos`; GET/PUT/DELETE `/planes/predictivos/:id`                                                                                       |
| Órdenes         | GET/POST `/ordenes-mantenimiento`; GET/PUT `/ordenes-mantenimiento/:id`; PATCH `/ordenes-mantenimiento/:id/cerrar`                                             |
| Trabajos        | GET/POST `/registros`; GET `/registros/:id` incluye repuestos utilizados                                                                                       |

Errores `{error: mensaje}`: 400 datos inválidos, 401 sin sesión, 403 permisos/CSRF, 404 inexistente, 409 relaciones o conflicto de stock/lectura, 500 inesperado. No se envía SQL al navegador. No hay DELETE de máquinas/órdenes/registros ni PUT de registros.

## Integridad y reglas

- El alta de máquina utiliza los valores predeterminados existentes: cero horas, Activo y fecha automática. La edición no acepta horas. La baja actualiza estado y deja la fecha al trigger.
- El ajuste manual acepta `{horas}`. Para bajar se requieren además `confirmar_reduccion: true` y `horas_esperadas` coincidente con la lectura bloqueada. La UI siempre envía la lectura esperada para detectar cambios concurrentes.
- Alta de repuesto, inventario inicial y asociaciones de proveedores se guardan en una transacción. La edición reemplaza asociaciones dentro de la misma transacción.
- La entrada de stock suma unidades con una actualización SQL atómica; cambiar el mínimo conserva existencias. Los colores se calculan en Angular, sin persistirlos.
- Las FK se respetan. Un repuesto con inventario o consumos no se elimina; una tarea referenciada por planes o registros devuelve 409 al intentar borrarla.
- Una tarea o un repuesto con ejecuciones/consumos no se reasigna a otra máquina. Tampoco una orden con registros. Así se preserva la coherencia de la máquina histórica derivada de la tarea.
- La orden deriva el empleado de sesión, usa fecha/estado predeterminados y permite editar mientras esté abierta. El cierre usa el trigger de fecha existente.

## Registro normal

El cuerpo incluye `tarea_id`, `medicion_horometro`, `duracion_inicio`, `duracion_fin`, `orden_mantenimiento_id` opcional, `repuestos: [{repuesto_id, cantidad}]`, `confirmar_reduccion` y `horas_esperadas`. No acepta operario, máquina u origen enviados por el cliente. Fechas locales en formato `YYYY-MM-DDTHH:mm` o con segundos, sin conversión de zona horaria; fin debe ser igual o posterior a inicio.

Dentro de una transacción se bloquean tarea, máquina, orden opcional, repuestos en orden de ID e inventarios. Se valida compatibilidad y stock antes de insertar registro y detalles. Los triggers descuentan existencias y actualizan horómetro; el servicio no repite esos cambios. Cualquier error revierte la operación completa, incluso una falla al insertar el segundo repuesto.

El historial toma la fecha de fin o, si falta, inicio; la tabla no tiene fecha de creación. Se permite registrar sin consumos. Las correcciones de registros y la ejecución extraordinaria requieren decisiones adicionales y no tienen endpoints de escritura.

## Planes y vista existente

Se consulta `proximos_servicios` para ambos tipos, conservando tablas independientes. Se calculan horas restantes contra el horómetro actual y estado VENCIDO si son ≤ 0, PRÓXIMO si no superan frecuencia × margen, y OK en el resto. `APP_SERVICE_MARGIN_PERCENT` permite ajustar el margen entre 0 y 100 (10 por defecto).

La vista usa `MAX(medicion_horometro)` y `MAX(duracion_fin)` independientemente; no necesariamente pertenecen a la misma ejecución. Si no hay lecturas registradas, parte del horómetro actual más frecuencia, por lo que el primer vencimiento se desplaza al cambiar las horas actuales. Se conserva este comportamiento y se deja pendiente acordar una base fija si el negocio la necesita.

## Verificación

- `npm test` en backend: autenticación, permisos, CSRF, validación de fechas/cantidades y contratos de campos; sin base real.
- `npm test` en frontend: sesión, permisos incluyendo rutas hijas, formulario de ejecución, confirmación de reducción, consumos duplicados, stock, horarios y reintento.
- `npm run build` en frontend: compilación de todas las pantallas y templates.
- `node scripts/check-maintenance.js --rollback-local` en backend: prueba HTTP integrada sobre el MySQL local con datos temporales y rollback final. No conserva filas; puede avanzar AUTO_INCREMENT. Cubre bajas/cierres por triggers, CRUD, FK, proveedores, planes, stock exacto y fallo intermedio de consumo. El script exige la bandera y rechaza otro host/esquema.

La adaptación PostgreSQL conserva estas reglas. Ver [Supabase](supabase.md) para configuración, migración de autenticación y pruebas completas en un clúster temporal con `npm run test:postgres`.

## Navegación de altas y ediciones

Las altas de tareas, planes, órdenes y máquinas se abren desde su menú, y todos los enlaces de regreso (incluido el mensaje posterior al guardado) vuelven a ese menú. Los listados no repiten accesos de alta. Las ediciones regresan al listado de su módulo. Repuestos mantiene el alta desde su pantalla unificada de inventario.
