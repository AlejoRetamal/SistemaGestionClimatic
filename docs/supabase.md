# Conectar Climatic a Supabase

El backend usa PostgreSQL para autenticación y mantenimiento. Angular sigue llamando a `/api`; no necesita claves de Supabase ni acceso directo a las tablas.

## Configuración local

Con los scripts `01-esquema.sql`, la semilla opcional `02-datos-prueba.sql` y `03-verificar.sql` ya ejecutados en tu proyecto, abrí **Connect → Transaction pooler** en Supabase y copiá la URI. El pooler evita depender de conectividad IPv6 y sirve para Vercel. Para un servidor persistente también se admite Session pooler.

En `backend/.env.local`:

```dotenv
APP_DATABASE_DRIVER=postgres
APP_DATABASE_ENABLED=true
APP_DATABASE_URL="postgresql://postgres.REFERENCIA:CONTRASENA@HOST_DEL_POOLER:6543/postgres"
APP_DATABASE_POOL_MAX=3
APP_ORIGIN=http://localhost:4200
APP_ENV=development
```

Usá el host, usuario y puerto exactos de **tu** URI. Reemplazá el marcador de contraseña por la contraseña de la base; codificá caracteres especiales en el componente contraseña de la URL (por ejemplo, `@` → `%40`, `#` → `%23`). No uses la URL HTTP del proyecto ni las claves `anon`/`service_role` como cadena de conexión. El rol de conexión debe tener acceso a las tablas privadas; la URI `postgres` del panel sirve para esta configuración inicial.

Conservá el `APP_PIN_SECRET` que ya existe. No lo regeneres después de la migración: determina cómo se localizan los PIN. Para una instalación nueva sin secreto, generá uno con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guardalo solamente en el entorno privado.

Las conexiones remotas siempre verifican TLS. Si el driver indica un error de certificado (`SELF_SIGNED_CERT_IN_CHAIN`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`), descargá el certificado raíz desde Database Settings de Supabase y guardá su contenido PEM en `APP_DATABASE_SSL_CA`, entre comillas y usando `\n` para separar líneas. No desactives la verificación del certificado. No uses `sslrootcert` en la URI: el certificado se configura mediante `APP_DATABASE_SSL_CA`.

## Preparar el login por PIN

Desde `backend`:

```powershell
npm run db:check-supabase
npm run db:prepare-supabase
npm run db:check-supabase
npm start
```

`db:check-supabase` solo lee: verifica conexión y esquema, muestra cantidades y comprueba el secreto si la migración ya existe. `/api/health` verifica únicamente el proceso y su configuración; no comprueba conectividad SQL.

`db:prepare-supabase` hace **una migración explícita en una transacción** sobre el esquema traducido:

- Convierte los PIN existentes en `pin_hash` scrypt y `pin_lookup` HMAC, manteniendo los ceros iniciales. No muestra PIN ni los usa para iniciar sesión.
- Elimina la columna de texto `pin` una vez convertidos todos los empleados; la misma transacción revierte todos los cambios si algo falla.
- Crea `sesiones` persistentes y `climatic_migrations`, con RLS y sin permisos de acceso para `anon`/`authenticated`.
- Mantiene IDs, empleados, roles, inventario e historial. No importa datos desde MySQL.
- Una segunda ejecución con el mismo secreto no repite la conversión. Si cambia `APP_PIN_SECRET`, falla: restaurá el original. Un error CONFIG también puede indicar un esquema distinto del traducido o PIN no numéricos; no se imprimen detalles del driver para evitar filtrar credenciales.

No ejecutés `db:migrate` ni `001_auth.sql` sobre Supabase: son el instalador anterior para una base local vacía. Tampoco repitas la semilla después de preparar autenticación; la columna `pin` ya no existe.

Reiniciá el backend si estaba abierto. Desde otra terminal, en `frontend`, ejecutá `npm start` y abrí **http://localhost:4200**. Se ingresa con el mismo PIN del empleado activo cargado **en Supabase**. Los empleados creados solo en el MySQL local no se copian automáticamente.

Si no cargaste empleados, después de preparar la autenticación podés crear el primero con este comando interactivo (PIN oculto):

```powershell
npm run employee:create -- --supabase
```

Las sesiones sobreviven a un reinicio del backend hasta su vencimiento. Los permisos por rol y CSRF se siguen validando en Express.

## Pruebas y despliegue siguiente

`npm test` ejecuta pruebas sin base externa. En Windows con PostgreSQL 18 instalado, `npm run test:postgres` crea una instancia temporal y comprueba esquema, migración atómica, PIN, persistencia, permisos y recorridos HTTP de mantenimiento, incluidos stock y rollback. No lee `.env.local` ni conecta a Supabase o MySQL.

El backend y frontend ya se publicaron en Vercel: ver [despliegue y actualizaciones](vercel.md). Las variables privadas están solo en el backend, con el mismo `APP_PIN_SECRET`, `APP_ENV=production`, el origen HTTPS de Angular y un pool de 2 conexiones. `/api` pasa por el dominio del frontend. Los intentos de login se controlan mediante contadores compartidos en PostgreSQL. La limpieza periódica de sesiones vencidas sigue pendiente.

Referencias: [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [tipos de node-postgres](https://node-postgres.com/features/types).
