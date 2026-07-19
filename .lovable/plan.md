# Migrar de Lovable Cloud a tu propio proyecto Supabase

## Contexto: qué es "Cloud" aquí

Lovable Cloud **ES Supabase por debajo** — no es una tecnología distinta. Lo que ves como "Cloud" es un proyecto de Supabase administrado por Lovable donde:

- La base de datos, auth, storage y edge son 100% Supabase estándar (Postgres + GoTrue + Storage + PostgREST).
- Lovable te oculta el dashboard de supabase.com y gestiona la `SERVICE_ROLE_KEY` y el password de DB por ti.
- Todo el código de la app (`createServerFn`, RLS, `supabaseAdmin`, migraciones) ya usa las APIs oficiales de Supabase — **no hay código propietario de Lovable que reemplazar**.

Por eso migrar es viable: es mover un proyecto Supabase administrado → a un proyecto Supabase tuyo.

## Es posible, pero tiene un camino específico

Lovable **no permite "desconectar" Cloud** de un proyecto ya creado con Cloud (una vez activo, no hay botón de disconnect para este proyecto — solo se puede desactivar Cloud para proyectos *futuros*). La ruta soportada oficialmente es **BYO Supabase (Bring Your Own)** vía soporte de Lovable.

### Camino recomendado (soportado, sin romper nada)

1. **Crear tu proyecto Supabase propio** en supabase.com (plan Free o Pro según necesidad).
2. **Exportar el estado actual desde Cloud**:
   - Datos: `Cloud → Advanced → Export data` (genera dump).
   - Esquema: ya está versionado en `supabase/migrations/*.sql` dentro del repo.
   - Storage: buckets (`backups`, avatares, etc.) requieren descarga + re-upload.
   - Secrets: lista actual (Stripe, LOVABLE_API_KEY, webhooks, etc.) para recrearlos.
3. **Contactar a support@lovable.dev** pidiendo el swap a BYO Supabase con:
   - Ref de tu nuevo proyecto Supabase.
   - Anon key + service role key nuevas.
   - Confirmación de que aceptas perder la administración automática de Cloud.
4. **Soporte hace el swap**: apunta la app a tu Supabase, regenera `src/integrations/supabase/client.ts` y `types.ts`, y actualiza las env vars (`VITE_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
5. **Tú aplicas las migraciones** del repo contra tu proyecto (`supabase db push` o corriendo los SQL de `supabase/migrations/` en orden).
6. **Restaurar datos y storage** desde el export.
7. **Reconfigurar en tu dashboard de Supabase**:
   - Auth providers (Google, Email, HIBP, contraseña strong).
   - `pg_cron` + `pg_net` (sorteo diario 20:00 ET, backup CSV, prune).
   - Webhooks de Stripe apuntando a tu nueva URL.
   - Todos los secrets (STRIPE_*, LOVABLE_API_KEY, etc.) como Edge Function Secrets.

## Qué ganas y qué pierdes

**Ganas**
- Acceso directo al dashboard supabase.com (SQL editor, logs, políticas, storage UI).
- Control total de `SERVICE_ROLE_KEY` y password de DB.
- Facturación directa con Supabase (no vía créditos Lovable).
- Portabilidad total: puedes salir de Lovable en cualquier momento.

**Pierdes**
- Herramientas Cloud del editor Lovable: el tool `supabase--migration` en el chat, el panel de "Backend", los tools de secrets integrados, el linter automático, y la vista de Jobs/Analytics dentro de Lovable.
- Auto-provisioning de Stripe/webhooks que Cloud maneja.
- Import protection y auto-regeneración de `types.ts` puede requerir pasos manuales (`supabase gen types`).
- Cambios de esquema desde el chat serán menos automáticos — deberás correr SQL tú mismo o pedirme que genere archivos que luego apliques.

## Riesgos y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos en el export/import | Hacer el swap en horario de bajo tráfico; mantener Cloud como backup 30 días |
| URLs de webhook Stripe cambian | Actualizar endpoints en Stripe **antes** de cortar Cloud |
| `pg_cron` no arranca en el nuevo proyecto | Recrear jobs manualmente con los SQL del repo |
| RLS mal migrado → filtración | Correr `security--run_security_scan` post-migración |
| Secrets no disponibles en runtime | Recrear todos vía Supabase Edge Function Secrets antes del cutover |
| Usuarios pierden sesión | Esperado — hay que re-loguear (los JWTs cambian de issuer) |

## Alternativa: quedarte en Cloud

Si el motivo principal es "quiero ver mis tablas y correr SQL", te recuerdo que puedes hacer casi todo eso desde el panel **Backend** de Lovable (SQL, tablas, RLS, storage, logs, secrets, users). La única diferencia real es no tener acceso a supabase.com directamente.

## Detalles técnicos

- La migración no requiere reescribir código de app: `@supabase/supabase-js`, `createServerFn`, `requireSupabaseAuth`, `supabaseAdmin` y todas las RLS funcionan idénticamente contra un proyecto BYO.
- Los archivos autogenerados (`src/integrations/supabase/client.ts`, `types.ts`, `.env` con `VITE_SUPABASE_*`) los regenera el flujo BYO.
- Migraciones actuales están en `supabase/migrations/` y son portables tal cual.
- Edge Functions existentes en `supabase/functions/` (si las hay) se despliegan con `supabase functions deploy`.

## Recomendación

Como es un proceso **irreversible** que involucra soporte humano de Lovable, te sugiero:

1. Confirmar **por qué** quieres migrar (¿acceso al dashboard? ¿facturación? ¿portabilidad?) — hay soluciones intermedias.
2. Si aún así quieres migrar, escribir a **support@lovable.dev** con el ref del proyecto (`d99974e1-204d-46a0-816a-e2595eaf444a`) pidiendo el swap a BYO Supabase, y ellos coordinan el corte.

¿Quieres que prepare el paquete de migración (checklist de secrets, lista de cron jobs, lista de buckets, y el bundle SQL consolidado) para tener todo listo antes de contactar a soporte?
