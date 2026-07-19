# Paquete de migración a BYO Supabase — HAZOREX

**Project ref (actual, en Lovable Cloud):** `d99974e1-204d-46a0-816a-e2595eaf444a`
**Contacto de swap:** support@lovable.dev

Este documento contiene TODO lo que necesitas para migrar el backend de Lovable Cloud a tu propio proyecto Supabase sin romper la app.

---

## 1. Antes de escribir a soporte — prepara tu Supabase

1. Crea un proyecto nuevo en https://supabase.com (región cercana al tráfico principal, plan Pro recomendado por `pg_cron` + `pg_net` + Storage).
2. Anota:
   - `SUPABASE_URL` (https://xxx.supabase.co)
   - `PROJECT_REF` (xxx)
   - `ANON / PUBLISHABLE KEY`
   - `SERVICE_ROLE_KEY`
   - Password de DB
3. En Auth → Providers habilita **Email** y **Google** (mismos redirect URIs que hoy).
4. En Auth → Policies activa **HIBP (leaked password protection)** y contraseña fuerte (mínimo 8 con símbolos).
5. Database → Extensions: habilita `pg_cron`, `pg_net`, `pgmq`, `pgcrypto`, `pg_trgm`.

---

## 2. Exportar datos desde Cloud

En Lovable: **Cloud → Advanced settings → Export data** (genera dump completo Postgres).
Guarda el `.sql` y espera confirmación por email.

---

## 3. Migraciones a aplicar (118 archivos)

Todas están en `supabase/migrations/` del repo, versionadas cronológicamente. Aplícalas en orden con Supabase CLI:

```bash
supabase link --project-ref <TU_REF>
supabase db push
```

O ejecuta cada `.sql` manualmente en SQL Editor si prefieres control granular.

---

## 4. Secrets a recrear (21)

En tu Supabase: **Project Settings → Edge Functions → Secrets**. Los que dicen "connector" o "managed" hay que **generarlos de cero** en tu propio Stripe / Google Cloud.

### Stripe (regenerar en tu cuenta Stripe)
- `STRIPE_SANDBOX_API_KEY` — Restricted key para sandbox
- `STRIPE_LIVE_API_KEY` — Restricted key para live
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET` — al crear webhook en Stripe sandbox
- `PAYMENTS_LIVE_WEBHOOK_SECRET` — al crear webhook en Stripe live
- `STRIPE_CONNECT_WEBHOOK_SECRET` — para Stripe Connect

### Google (regenerar en Google Cloud Console)
- `GOOGLE_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_MAPS_BROWSER_KEY`
- `GOOGLE_MAPS_TRACKING_ID`

### Turnstile (Cloudflare)
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`

### Push notifications (VAPID)
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT`

### Webhooks internos (generar strings random de 32+ chars: `openssl rand -hex 32`)
- `BACKUP_HOOK_SECRET`
- `DRAW_CRON_SECRET`
- `PRE_DRAW_NOTIFY_SECRET`
- `SECURITY_ALERT_SECRET`
- `TEST_DRAW_TICK_SECRET`
- `WINNER_NOTIFY_SECRET`

### Lovable-específico (se puede eliminar tras migrar)
- `LOVABLE_API_KEY` — solo si sigues usando Lovable AI Gateway; si no, quítalo del código

**IMPORTANTE:** Después de generar cada `webhook secret`, actualiza el valor correspondiente en `public.internal_hook_config`:

```sql
UPDATE public.internal_hook_config SET value = '<nuevo_valor>' WHERE key IN (
  'security_alert_url','security_alert_secret',
  'notify_order_url','notify_order_secret',
  'notify_winner_url','notify_winner_secret',
  'notify_pre_draw_url','notify_pre_draw_secret',
  'backup_csv_url','backup_hook_secret',
  'test_draw_tick_url','test_draw_tick_secret',
  'draw_cron_url','draw_cron_secret'
);
```

Reemplaza también las URLs con `https://<tu-dominio>/api/public/hooks/...`.

---

## 5. Storage buckets a recrear (5)

Todos privados. Crear en Storage → New bucket:

| Bucket | Público | Contenido |
|---|---|---|
| `backups` | ❌ | CSV diarios y semanales del backup job |
| `delivery-proofs` | ❌ | Fotos de entrega |
| `driver-documents` | ❌ | Licencias, seguros de repartidores |
| `reels` | ❌ | Videos de productos |
| `winner-documents` | ❌ | ID/W-9 de ganadores del sorteo |

Después de crear los buckets, **re-uploadea los archivos** del export de Cloud. Las políticas RLS de storage vienen incluidas en las migraciones.

---

## 6. Cron jobs a recrear (10)

Corre este SQL en tu Supabase (reemplaza `<HOST>` por tu dominio publicado, ej. `hazorex.lovable.app`):

```sql
-- Sorteo diario y utilidades
SELECT cron.schedule('sweepstakes-run-daily-draw', '0 0,1 * * *',
  $$SELECT public.run_daily_draw_safe();$$);

SELECT cron.schedule('daily-draw-safe-every-10min', '*/10 * * * *',
  $$SELECT public.run_daily_draw_safe();$$);

SELECT cron.schedule('daily-draw-audit-2355et', '55 3,4 * * *',
  $$SELECT public.run_daily_draw_safe();$$);

SELECT cron.schedule('sweepstakes-close-cutoff', '* * * * *',
  $$SELECT public.close_draws_for_cutoff();$$);

SELECT cron.schedule('sweepstakes-expire-claims', '7 * * * *',
  $$SELECT public.expire_pending_claims();$$);

SELECT cron.schedule('daily-roulette-draw', '0 0,1 * * *',
  $$SELECT public.run_daily_draw_safe();$$);

-- Pre-draw email (5 min antes)
SELECT cron.schedule('notify-pre-draw-5min', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://<HOST>/api/public/hooks/notify-pre-draw',
    headers := jsonb_build_object('apikey', '<ANON_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

-- Backup diario CSV
SELECT cron.schedule('backup-csv-daily-secure', '30 7 * * *', $$
  SELECT net.http_post(
    url := 'https://<HOST>/api/public/hooks/backup-csv',
    headers := jsonb_build_object('apikey', '<ANON_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('backup-prune-weekly', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://<HOST>/api/public/hooks/backup-prune',
    headers := jsonb_build_object('apikey', '<ANON_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

-- Purga soft-deletes viejos
SELECT cron.schedule('purge-soft-deleted', '0 3 * * *',
  $$SELECT public.purge_soft_deleted_rows();$$);
```

---

## 7. Auth configuración adicional

- **Site URL:** `https://hazorex.lovable.app` (o tu dominio final)
- **Redirect URLs permitidas:**
  - `https://hazorex.lovable.app/**`
  - `https://www.hazorex.com/**`
  - `https://hazorex.com/**`
  - `https://www.origen.management/**`
- **Google OAuth:** copia Client ID + Secret desde tu Google Cloud console.

---

## 8. Webhooks externos a reapuntar

### Stripe
En dashboard.stripe.com → Developers → Webhooks:
- Sandbox endpoint: `https://<HOST>/api/public/payments/webhook?env=sandbox`
- Live endpoint: `https://<HOST>/api/public/payments/webhook?env=live`
- Stripe Connect: `https://<HOST>/api/public/stripe/connect-webhook`
- Eventos: `customer.subscription.*`, `checkout.session.completed`, `invoice.payment_failed`

---

## 9. Escribir a Lovable Soporte

Envía email a **support@lovable.dev**:

> Asunto: Swap a BYO Supabase — proyecto `d99974e1-204d-46a0-816a-e2595eaf444a`
>
> Hola equipo,
>
> Quiero migrar mi proyecto HAZOREX (ref `d99974e1-204d-46a0-816a-e2595eaf444a`) de Lovable Cloud a mi propio proyecto Supabase.
>
> Datos del nuevo Supabase:
> - Project ref: `<TU_REF>`
> - URL: `https://<TU_REF>.supabase.co`
> - Anon key: `<TU_ANON_KEY>`
> - (Service role key la envío por canal seguro cuando me indiquen)
>
> He preparado migraciones, secrets, buckets y cron jobs. Datos exportados con Cloud → Advanced → Export data.
>
> Por favor confirmen ventana de mantenimiento para hacer el swap.
>
> Gracias.

---

## 10. Post-swap checklist

Cuando soporte confirme:

- [ ] Verificar que `.env` tiene las nuevas `VITE_SUPABASE_*` y `SUPABASE_*`
- [ ] Regenerar `src/integrations/supabase/types.ts` con `supabase gen types typescript --project-id <TU_REF>`
- [ ] Restaurar datos del dump
- [ ] Re-uploadear archivos de storage
- [ ] Correr `security--run_security_scan` (o revisión manual de RLS)
- [ ] Login de prueba (email + Google)
- [ ] Compra de prueba en sandbox Stripe
- [ ] Verificar que el sorteo diario corre a las 20:00 ET
- [ ] Verificar que llegan emails (Lovable Email o SMTP propio si migras también eso)
- [ ] Anunciar a usuarios que deben re-loguearse (JWTs cambian de issuer)

---

## Riesgos residuales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Datos desincronizados entre export y cutover | Alto | Ventana de mantenimiento + freeze de escrituras |
| Webhook Stripe llega antes de reapuntar | Medio | Reapuntar Stripe primero, luego cortar Cloud |
| Cron no ejecuta primer día | Bajo | Recrear jobs antes del cutover; verificar `cron.job_run_details` |
| Lovable Email deja de funcionar | Medio | Migrar a Resend/Postmark/SES con tus credenciales |
| Perder edición de esquema desde el chat | Bajo | Puedes seguir pidiéndome archivos SQL que aplicas tú mismo |
