# Despliegue de Climatic en Vercel

- Aplicación: https://climatic-srl-frontend.vercel.app
- API: https://climatic-srl-backend.vercel.app/api/health
- Cuenta/equipo: `alejoretamals-projects`.
- Proyectos: `climatic-srl-frontend` y `climatic-srl-backend`.

Los proyectos anteriores `tal-como-eres` y `java` se dieron de baja por indicación del usuario después de verificar Climatic.

## Configuración

Cada carpeta tiene su propio `vercel.json`. El backend exporta una instancia Express desde `backend/app.js`, usa Node 24 y ejecuta las funciones en `gru1`. `src/runtime.js` comparte la composición con el servidor local y crea el pool de forma diferida. El frontend ejecuta sus 44 pruebas antes de cada build y compila Angular a `dist/frontend/browser` y resuelve rutas directas de la SPA.

El frontend reescribe `/api/*` hacia el backend. El navegador usa una sola dirección: las cookies `Secure`, `HttpOnly` y `SameSite=Strict` funcionan bajo el dominio de la aplicación. `APP_ORIGIN` debe ser exactamente `https://climatic-srl-frontend.vercel.app`. Todas las respuestas de la API llevan `Cache-Control: no-store`.

Las variables de Supabase se configuraron únicamente en **Production del backend**. `APP_DATABASE_URL` y `APP_PIN_SECRET` son variables sensibles. Se conserva el secreto con el que se migraron los empleados. La conexión usa el Transaction pooler, certificado raíz verificado y un máximo de 2 conexiones por instancia. No hay claves de Supabase en Angular.

`backend/.env.local` y `.vercel/` están ignorados por Git. Los archivos `.vercelignore` excluyen secretos, logs, código legado y artefactos locales del despliegue. Las carpetas locales `.vercel` guardan la asociación con cada proyecto; no se suben al repositorio.

## Actualizar desde este equipo

Desde la raíz del repositorio, después de probar los cambios:

```powershell
# En este equipo Windows, la CLI requiere el almacén de certificados del sistema.
$env:NODE_USE_SYSTEM_CA='1'
vercel deploy --prod --yes --cwd backend
vercel deploy --prod --yes --cwd frontend
```

Este despliegue se realizó con la CLI. No se configuró una integración Git que publique automáticamente cada push. Desde otro equipo hay que iniciar sesión y vincular las carpetas a los mismos proyectos con `vercel link --project ... --cwd ... --yes`.

Para volver a cargar las variables privadas sin poner secretos en argumentos de terminal:

```powershell
node backend/scripts/configure-vercel.js https://climatic-srl-frontend.vercel.app C:/Users/usuario/AppData/Roaming/npm/node_modules/vercel/dist/vc.js
```

El script lee `.env.local`, verifica el proyecto enlazado y pasa los valores por stdin; muestra solamente los nombres. Los cambios de variables requieren un nuevo despliegue. Los previews no tienen acceso a la base de producción configurado por este proceso.

## Protección del login

En producción, `login_attempts` guarda contadores compartidos de 10 intentos por dirección cada 15 minutos, incluidos los exitosos. Se utiliza un digest HMAC de la IP y no se almacena la dirección en texto. El incremento es atómico entre instancias y las entradas vencidas se limpian al procesar un login. La tabla tiene RLS y no está accesible a `anon`/`authenticated`.

En Vercel se usa `x-vercel-forwarded-for`, encabezado de la plataforma; fuera de Vercel se usa `req.ip`. No se habilita confianza indiscriminada en proxies. El entorno de desarrollo mantiene el limitador en memoria.

La preparación explícita de esta tabla es `npm run db:prepare-deployment` desde backend. Ya fue aplicada en Supabase; no se ejecuta al arrancar la aplicación.

Angular se actualizó dentro de la rama 21.2 para resolver los avisos detectados durante el primer build; el conjunto final de dependencias no presenta vulnerabilidades según `npm audit`.

## Verificación

- 42 pruebas de backend y 44 de frontend, más `npm run test:postgres` en un clúster temporal.
- Prueba pública de rutas Angular, `/api/health`, rechazo de acceso anónimo y ausencia de caché de la API.
- `node scripts/check-vercel.js --temporary-employee` desde backend crea un empleado sintético, verifica login, cookies, sesión, CSRF, logout y lecturas de mantenimiento a través del dominio del frontend. Elimina su empleado y sesiones al terminar. No consulta PIN de empleados existentes ni escribe datos de mantenimiento; la secuencia de IDs puede avanzar.

Referencias oficiales: [Express en Vercel](https://vercel.com/docs/frameworks/backend/express), [reescrituras](https://vercel.com/docs/routing/rewrites), [encabezados de la plataforma](https://vercel.com/docs/headers/request-headers).
