# Conservación y migración

## Ampliación actual de mantenimiento

El usuario pidió continuar sobre MySQL `datos_climatic`. Se inspeccionaron tablas, claves, triggers y `proximos_servicios` localmente. Los nuevos servicios realizan escrituras de mantenimiento mediante la API protegida. Se probaron con datos temporales y rollback final; no quedaron filas de prueba, aunque los contadores AUTO_INCREMENT pueden avanzar. No se cambiaron tablas, vistas ni triggers.

El esquema activo usa `repuestos.maquina_id` y `registro_tareas_repuestos`. Las relaciones alternativas descritas más abajo corresponden exclusivamente a la propuesta PostgreSQL anterior, no al MySQL actual. No se ejecutó ninguna importación o migración ni se accedió a la base remota de Jorge. Ver [mantenimiento.md](mantenimiento.md).

## Historial: conexión local provisional inicial

Posteriormente el usuario autorizó conectar la app a su MySQL local `datos_climatic`. Se verificaron columnas, grupos y unicidad de PIN activos mediante consultas de solo lectura. También se verificó login, recuperación de sesión, acceso a un módulo y logout usando el proxy de Angular. No se ejecutaron migraciones ni escrituras en esa base. Las sesiones se guardan en memoria del backend.

## Implementación original de fase 1

- Se conservaron los controladores/rutas MySQL y la UI anterior en carpetas `legacy`.
- No se accedió a PostgreSQL, MySQL ni a la base de Jorge.
- No se ejecutó SQL, no se importaron datos y no se crearon usuarios reales.
- El `.env` anterior no se carga ni se usa como base de configuración nueva.
- La aplicación nunca migra al iniciar.

## Base nueva y base anterior

`001_auth.sql` sirve exclusivamente para una instalación nueva. El instalador local exige confirmación por flag, localhost y nombres `climatic_dev` o `climatic_test`. No pretende transformar el esquema Budibase existente.

Una migración real requiere un DDL y un export autorizados previamente. Se puede trabajar con archivos exportados sin acceder a la base original. No solicitar ni copiar credenciales de Jorge.

## Revisión previa a la importación

1. Inventariar columnas, tipos, PK/FK, secuencias, triggers y relaciones del export real.
2. Detectar PIN duplicado, incluyendo empleados inactivos, y resolverlo explícitamente.
3. Transformar PIN en hashes/HMAC con un proceso local que no imprima valores. No inventar PIN faltantes ni conservar texto plano en la nueva base.
4. Conservar IDs cuando sea necesario para las referencias y ajustar las secuencias tras importar.
5. Detectar tareas sin máquina, proveedores incoherentes, órdenes cerradas sin responsable/fecha y registros que incumplan XOR.
6. Conciliar stocks negativos o duplicados. No corregir cantidades automáticamente sin criterio aprobado.
7. Comparar conteos e integridad antes y después en una copia independiente.

## Repuestos en la propuesta PostgreSQL anterior

La nueva relación es `repuestos_maquinas`; no se utiliza `tareas_repuestos` para filtrar repuestos al registrar trabajos.

La relación antigua puede generar candidatos deduplicados `repuesto_id + tarea.maquina_id`, pero deben revisarse: la asociación histórica a una tarea no certifica por sí sola todas las compatibilidades. No se elimina automáticamente `tareas_repuestos`.

`registro_tareas_insumos` se conserva como detalle interno de cada ejecución; no tiene módulo ni ruta de UI propia. Sus registros históricos deben preservarse.

La futura transacción de registro derivará empleado de sesión y máquina de la tarea, comprobará orden compatible, bloqueará existencias en orden consistente, validará compatibilidad/stock y guardará ejecución, detalles, descuento y horómetro de forma atómica. No se implementó esa operación anticipadamente en fase 1.

## Secretos anteriores

Se retiraron del seguimiento Git `backend/.env` y los `node_modules` antes versionados; los archivos locales se conservaron. `.gitignore` excluye también las configuraciones locales, los logs y los archivos generados.

Esto no borra secretos del historial. Sus credenciales deben revisarse/rotarse por su responsable. No se reescribió el historial ni se accedió a sistemas externos para hacerlo.
