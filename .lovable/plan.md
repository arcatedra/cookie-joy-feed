# Conectar tu propio Supabase — pasos según la respuesta de soporte

Soporte confirmó que **tú mismo** puedes hacer el swap desde el editor de Lovable, sin ticket adicional. La ruta es:

## 1. Preparar tu proyecto Supabase (antes de tocar Lovable)

Sigue lo que ya está documentado en `MIGRATION-BYO-SUPABASE.md`:

- Crear proyecto en supabase.com (plan Pro recomendado por `pg_cron` + `pg_net` + Storage).
- Habilitar extensiones: `pg_cron`, `pg_net`, `pgmq`, `pgcrypto`, `pg_trgm`.
- Activar providers de Auth (Email + Google), HIBP y política de contraseña fuerte.
- Tener a mano: `SUPABASE_URL`, project ref, anon key, service_role key, DB password.

## 2. Exportar datos actuales desde Lovable Cloud

En el editor: **Cloud → Advanced settings → Export data**. Guarda el dump `.sql` y espera confirmación por email.
Descarga también manualmente los archivos de los 5 buckets de Storage (`backups`, `delivery-proofs`, `driver-documents`, `reels`, `winner-documents`).

## 3. Remover Lovable Cloud del proyecto

En el editor: **Cloud → Advanced settings → Remove Lovable Cloud**.

Esto desconecta la DB administrada. La app quedará sin backend hasta el paso 4 — hazlo en ventana de mantenimiento.

## 4. Conectar tu propio Supabase

En el editor: **Cloud (pestaña arriba a la izquierda) → link "Already have a Supabase project? Connect it here"** → autorizar Lovable en tu cuenta de Supabase → seleccionar el proyecto nuevo.

Lovable regenera automáticamente `src/integrations/supabase/client.ts`, `types.ts`, y las env vars `VITE_SUPABASE_*` / `SUPABASE_*` apuntando a tu proyecto.

## 5. Aplicar esquema, datos, secrets y cron

En tu Supabase nuevo (ya conectado):

- Aplicar las 118 migraciones de `supabase/migrations/` (con `supabase db push` o SQL editor en orden).
- Restaurar el dump de datos exportado en paso 2.
- Re-uploadear archivos a los 5 buckets.
- Crear los 21 secrets (Stripe, Google, Turnstile, VAPID, webhooks internos) — lista completa en `MIGRATION-BYO-SUPABASE.md`.
- Actualizar `public.internal_hook_config` con los nuevos valores de secrets y URLs.
- Recrear los 10 `pg_cron` jobs (SQL listo en el mismo doc).
- Reapuntar webhooks de Stripe (sandbox + live + Connect) a `https://<tu-host>/api/public/...`.

## 6. Verificación post-swap (lo hago yo cuando avises)

Cuando termines los pasos 1–5, dime "verifica la conexión" y confirmo:
- `.env` apunta a tu URL y anon key.
- Login (email + Google) funciona contra tu GoTrue.
- Un `createServerFn` protegido responde OK (RLS activa como el usuario).
- `supabaseAdmin` funciona en un webhook (service_role OK).
- `pg_cron` tiene los 10 jobs registrados.
- `security--run_security_scan` pasa sin regresiones de RLS.

## Riesgos clave

| Riesgo | Mitigación |
|---|---|
| Al remover Cloud, la app queda sin backend hasta conectar el tuyo | Hacer paso 3 y 4 back-to-back en ventana de bajo tráfico |
| Webhooks Stripe llegan durante el corte | Reapuntar Stripe **antes** de remover Cloud, o pausar temporalmente |
| Usuarios pierden sesión | Esperado — el JWT issuer cambia; comunicar re-login |
| Cron no arranca día 1 | Ejecutar SQL del paso 5 inmediatamente tras conectar y verificar en `cron.job_run_details` |
| `types.ts` desactualizado tras regenerar | Correr `supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts` si Lovable no lo hace |

## Qué NO cambia

El código de la app (`createServerFn`, `requireSupabaseAuth`, `supabaseAdmin`, RLS, migraciones) es 100% Supabase estándar y sigue funcionando idéntico contra tu proyecto BYO. No hay refactor de código requerido.

## Siguiente acción sugerida

Confírmame cuándo hayas creado el proyecto Supabase y tengas exportados los datos, y coordinamos el momento del swap para minimizar downtime.
