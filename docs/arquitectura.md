# Arquitectura

El mantenimiento activo está documentado en [mantenimiento.md](mantenimiento.md). Autenticación y operaciones funcionan con PostgreSQL/Supabase o con MySQL local. [supabase.md](supabase.md) describe la configuración y la migración explícita del esquema traducido. PostgreSQL comparte un pool entre autenticación y mantenimiento; su adaptador usa parámetros, `RETURNING`, `ON CONFLICT` y transacciones con una conexión dedicada. Normaliza IDs/decimales como números y conserva fechas locales como strings.

## Adaptación provisional a MySQL local

Se agregó, a pedido del usuario, `APP_DATABASE_DRIVER=mysql-local` para el esquema `datos_climatic` de localhost. Las credenciales se configuraron explícitamente en `.env.local`; no se carga automáticamente el `.env` anterior. Este modo se rechaza en producción o para otro host/esquema.

`mysql-employee.repository.js` consulta empleados mediante parámetros y transacciones de solo lectura. Usa los PIN existentes de la base provisional, sin convertirlos, modificarlos ni devolverlos a Angular. Si un PIN identifica varios empleados activos, el login se rechaza.

`mysql-auth.service.js` mantiene sesiones en memoria con tokens aleatorios, CSRF y vencimiento. Consulta el estado y rol actual del empleado en cada petición protegida. Al reiniciar la API se cierran todas las sesiones. Los scripts de instalación PostgreSQL rechazan el modo MySQL. `config/mysql-db.js` proporciona un pool separado para las escrituras de mantenimiento autorizadas en el esquema local.

## Backend

```text
backend/
  src/
    config/          entorno, adaptadores PostgreSQL/MySQL y permisos
    controllers/     adaptación HTTP de autenticación y mantenimiento
    routes/          endpoints activos
    services/        PIN, sesión y reglas de negocio de mantenimiento
    middlewares/     sesión, permisos, errores y límite de intentos
    db/migrations/   instalación incremental para una base nueva
    app.js           aplicación inyectable, sin listen ni conexiones
    server.js        composición y ciclo de vida
  scripts/           instalador PostgreSQL y prueba MySQL con rollback
  test/              pruebas sin base real
  legacy/mysql/      CRUD anterior archivado, no montado
```

Los servicios reciben el adaptador de base de datos. El pool se crea de forma diferida, solo ante una operación habilitada explícitamente. No se usa el `.env` antiguo ni `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` o `DATABASE_URL`: solo `APP_*` en `.env.local` o el entorno del proceso.

Los controladores antiguos permanecen archivados. Los endpoints nuevos de mantenimiento usan el esquema de mantenimiento con validaciones, permisos y transacciones; no se montan los controladores anteriores.

## Autenticación

Se conserva la decisión del usuario: **PIN único, sin email para ingresar**. El PIN se recibe como string para conservar ceros iniciales. El límite de 128 dígitos evita entradas desproporcionadas; no define una longitud empresarial obligatoria.

- En el adaptador PostgreSQL: `pin_lookup` HMAC-SHA256 con `APP_PIN_SECRET` y UNIQUE, más `pin_hash` scrypt con salt individual. El adaptador MySQL conserva el formato de PIN existente y rechaza coincidencias ambiguas entre empleados activos.
- Token y CSRF aleatorios de 256 bits; sus digests se guardan en PostgreSQL o en memoria en el modo MySQL local.
- Cookie de sesión `HttpOnly`, `SameSite=Strict`, `Secure` en producción y vencimiento de 8 horas por defecto, configurable.
- CSRF en cookie legible por Angular y encabezado `X-CSRF-Token` para cambios autenticados.
- Se comprueba empleado activo, vencimiento y rol actual en cada petición protegida.
- Login limitado a 10 intentos por IP cada 15 minutos, incluidos intentos exitosos. En desarrollo el contador está en memoria; en producción PostgreSQL usa la tabla privada `login_attempts`, compartida entre instancias.
- Respuestas de autenticación con `Cache-Control: no-store`. No se devuelven PIN, hashes ni token de sesión en JSON.
- No se guarda identidad ni permisos en `localStorage`. La aplicación recupera el usuario mediante `/api/auth/me` antes de navegar.

Los hashes protegen el almacenamiento, pero un PIN corto tiene poca entropía. La política de longitud y el bloqueo por empleado quedan pendientes de definición; no se impuso una longitud nueva ni un bloqueo permanente.

Las sesiones expiradas se rechazan siempre. En PostgreSQL queda pendiente programar limpieza de filas expiradas.

## Permisos

La fuente central es `backend/src/config/permissions.js`. La API entrega `modulos` junto al usuario; Angular usa esos permisos en un único `PermissionService` para las tarjetas y los guards. El servidor vuelve a aplicar su propia matriz en los endpoints.

| Grupo          | Administración | Producción | Mantenimiento | Comercial |
| -------------- | -------------- | ---------- | ------------- | --------- |
| Direccion      | Sí             | Sí         | Sí            | Sí        |
| Administracion | Sí             | No         | No            | No        |
| Mantenimiento  | No             | No         | Sí            | No        |
| Produccion     | No             | No         | Sí            | No        |

Por instrucción del usuario, las acciones de mantenimiento conservan el permiso del módulo, sin introducir diferencias adicionales entre Dirección, Mantenimiento y Producción. La definición de permisos por acción queda pendiente si el negocio la requiere.

## API activa

| Método | Ruta                   | Comportamiento                                                                       |
| ------ | ---------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/api/health`          | Estado del proceso, sin consulta a ninguna base                                      |
| POST   | `/api/auth/login`      | `{ "pin": "..." }`; cookies y usuario público                                        |
| GET    | `/api/auth/me`         | Usuario actual o 401                                                                 |
| POST   | `/api/auth/logout`     | Requiere sesión y CSRF; revoca sesión, borra cookies                                 |
| GET    | `/api/modulos/:modulo` | Cuatro rutas concretas; requiere sesión y permiso; mantenimiento disponible en PostgreSQL y MySQL |

La API completa de mantenimiento se detalla en [mantenimiento.md](mantenimiento.md).

Usuario público: `id`, `nombre`, `apellido`, `email`, `grupo`, `modulos`.
Errores: `{ "error": "mensaje legible" }`. SQL y detalles internos no se devuelven.

## Angular

```text
frontend/src/app/
  core/
    auth/             sesión global, recuperación e interceptor 401
    models/           contratos TypeScript
    guards/           autenticación, acceso de invitados y permisos
    permissions/      catálogo de módulos y permisos del usuario
    services/         HTTP encapsulado
  shared/             shell, mensajes y manejo de errores
  features/
    login/            Reactive Forms
    inicio/           menú y pantalla base de módulos
    mantenimiento/    tarjetas y rutas hijas protegidas
    maquinas/         altas, edición, baja y horómetro
    repuestos-inventario/ repuestos, proveedores y movimientos de entrada
    tareas/           configuración y modelos del catálogo
    tareas-extraordinarias/ definiciones extraordinarias
    planes/           preventivos y predictivos
    ordenes/          alta, edición y cierre
    registros/        ejecución, historial y detalle
```

Los formularios/listados de catálogos reutilizan `shared/catalog`. Las cuatro rutas base existen y las tarjetas de mantenimiento navegan a las funciones implementadas. Los submenús agrupan Tareas, Máquinas, Planes y Órdenes. El mantenimiento distingue explícitamente las altas de definiciones del registro de tareas programadas; se retiró la pantalla de registro extraordinario.

El login siempre lleva a `/inicio`. Las rutas `/inicio/administracion`, `/inicio/produccion`, `/inicio/mantenimiento` y `/inicio/comercial` tienen guards. Existe tratamiento de acceso restringido, página inexistente, errores HTTP y carga.

## Despliegue posterior

Servir Angular y `/api` bajo el mismo origen HTTPS mediante un proxy. La configuración de desarrollo conserva el origen `http://localhost:4200`. No configurar `trust proxy` indiscriminadamente: el límite por IP depende de la topología real. El despliegue vigente por CLI está documentado en [vercel.md](vercel.md).
