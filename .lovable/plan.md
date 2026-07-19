## Estado actual verificado

- Conector de plataforma (Lovable): **ya apunta a tu proyecto nuevo** — ref `oyvbxkluvkrljvewrgue`. Solo contiene la tabla `HAZOREXX` que creaste manualmente.
- `.env` / runtime de la app: **sigue apuntando al proyecto viejo de Cloud** (`dmoqrcagdhsuqlbmlckt`). Los usuarios que abran el sitio ahora mismo siguen escribiendo en el Supabase antiguo.
- Tu Supabase nuevo NO tiene: las 118 migraciones, roles/RLS, auth users, storage buckets, cron jobs, ni secrets.

Es decir, el swap **no está completo**. Si actualizamos solo el `.env` ahora, la app se rompe (no hay tablas, no hay auth, no hay funciones RPC).

## Plan para dejarlo funcionando

### 1. Confirmar con soporte qué hicieron exactamente
Antes de tocar nada más, responder al correo de soporte preguntando:
- ¿Ya ejecutaron el swap de backend, o solo vincularon la referencia del proyecto?
- ¿Migraron datos y schema desde `dmoqrcagdhsuqlbmlckt` a `oyvbxkluvkrljvewrgue`, o el proyecto nuevo se queda vacío y nosotros aplicamos las migraciones?
- ¿Quién actualiza `.env` con las nuevas `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — ellos o nosotros desde el editor?

### 2. Preparar el proyecto nuevo (según respuesta)
Si soporte NO migra datos automáticamente, del lado tuyo en supabase.com hay que:
- Aplicar las 118 migraciones de `supabase/migrations/` (en orden).
- Recrear los 5 storage buckets (`backups`, `delivery-proofs`, `driver-documents`, `reels`, `winner-documents`) con sus policies.
- Cargar los 21 secrets (Stripe, Google Maps, Turnstile, VAPID, DRAW/WINNER/BACKUP secrets, etc.).
- Recrear los 10 cron jobs (sorteo diario 20:00 ET, backups, notificaciones).
- Exportar/importar los datos que quieras conservar (`auth.users`, `orders`, `subscriptions`, `daily_draws`, etc.) vía `pg_dump` / CSV.

Todo esto ya está listado paso a paso en `MIGRATION-BYO-SUPABASE.md`.

### 3. Actualizar la app para apuntar a tu Supabase
Solo cuando el proyecto nuevo tenga schema + datos + secrets:
- Actualizar `.env`, `.env.development`, `.env.production` con `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` (y las variantes `VITE_*`) del proyecto `oyvbxkluvkrljvewrgue`.
- Actualizar `supabase/config.toml` (`project_id`).
- Regenerar `src/integrations/supabase/types.ts` contra el nuevo proyecto.

### 4. Verificar
- Login/signup contra el nuevo Auth.
- Un CRUD con RLS (favoritos, historial).
- Un server function protegido (`getMyPosts` o similar) para confirmar que el bearer llega y `has_role` funciona.
- Stripe webhook apuntando a la URL correcta.
- Cron del sorteo diario ejecutándose a las 20:00 ET.

## Qué necesito de ti para avanzar

Dime cuál de estos casos es el tuyo:
- **(A)** Soporte ya migró todo el schema/datos y solo falta actualizar `.env` → paso directo al punto 3-4.
- **(B)** Soporte solo vinculó el proyecto vacío y nosotros aplicamos migraciones/secrets → ejecutamos 2, 3, 4.
- **(C)** No estoy seguro → responde a soporte con las 3 preguntas del punto 1 y me pasas lo que digan.
