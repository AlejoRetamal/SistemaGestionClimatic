# Climatic SRL · Gestión interna

Aplicación existente ampliada con Angular standalone, Reactive Forms, Express y el MySQL local `datos_climatic`.

## Estado actual

Se conservan el ingreso con **PIN único**, las sesiones, los roles, el menú `/inicio` y el diseño. Mantenimiento incluye:

- Máquinas: alta, listado, edición y baja; horómetro en pantalla independiente.
- Repuestos, proveedores asociados e inventario: entradas acumulativas, mínimos y estados visuales.
- Definiciones de tareas normales y extraordinarias.
- Planes preventivos y predictivos separados, consultando la vista existente `proximos_servicios`.
- Órdenes: alta, edición mientras están abiertas y cierre.
- Historial y detalle de trabajos; registro de tareas con varios repuestos en una transacción.

El registro de ejecuciones extraordinarias tiene una pantalla que explica la relación faltante en el modelo. Las correcciones del historial quedan pendientes. Administración, Producción y Comercial mantienen sus pantallas base.

## Ejecutar

Requisitos: Node.js 24, npm y MySQL local con el esquema existente `datos_climatic`. En dos terminales desde la raíz del proyecto:

```powershell
cd backend
npm ci
npm start
```

```powershell
cd frontend
npm ci
npm start
```

Abrir **http://localhost:4200**, ingresar el PIN de un empleado activo y entrar en **Mantenimiento**. Al reiniciar el backend se cierran las sesiones y hay que volver a ingresar.

La configuración local está en `backend/.env.local` y no se versiona. El backend carga solamente variables `APP_*`; no carga el `.env` antiguo. La configuración actual usa `APP_DATABASE_DRIVER=mysql-local`, `APP_DATABASE_ENABLED=true`, host `127.0.0.1` y esquema `datos_climatic`. Este modo solo admite desarrollo y ese esquema local.

La autenticación consulta empleados sin modificarlos. Las operaciones de mantenimiento **sí escriben** en las tablas locales cuando se guardan formularios. No hay migraciones al arrancar, cambios automáticos de esquema ni acceso a una base remota de Jorge.

Sin configuración habilitada, la app muestra el error de base deshabilitada al ingresar. No hay PIN de demostración ni acceso alternativo.

## Pruebas

Pruebas aisladas, sin credenciales ni base real:

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm test
npm run build
```

Comprobación opcional sobre el MySQL local ya configurado:

```powershell
cd backend
node scripts/check-maintenance.js --rollback-local
```

Este último comando crea datos temporales dentro de una transacción y ejecuta un `ROLLBACK` final. Verifica CRUD, triggers, permisos de campos, conflictos y reversión completa ante una falla intermedia de consumo. No conserva filas de prueba, pero MySQL puede avanzar los contadores `AUTO_INCREMENT`. No ejecuta cambios de esquema. Requiere un empleado activo y la vista/triggers existentes.

## Documentación

La carpeta `docs` contiene documentación para desarrollo; no es necesaria para abrir la aplicación.

- [Mantenimiento: rutas, API, reglas y pruebas](docs/mantenimiento.md).
- [Arquitectura y autenticación](docs/arquitectura.md).
- [Decisiones confirmadas y pendientes](docs/decisiones-pendientes.md).
- [Conservación y migración de datos](docs/migracion-datos.md).
- [Propuesta PostgreSQL anterior](docs/esquema-postgresql.sql), no ejecutada sobre MySQL.

Los scripts `db:migrate` y `employee:create` pertenecen a la preparación previa de autenticación PostgreSQL y rechazan el modo MySQL. El mantenimiento actual usa el esquema MySQL existente; esos scripts no lo instalan ni lo migran. El código anterior permanece archivado en `backend/legacy/mysql` y `frontend/legacy`, fuera de la aplicación activa.
