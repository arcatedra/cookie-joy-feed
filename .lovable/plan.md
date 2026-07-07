## Objetivo

Extender el webhook existente `src/routes/api/public/stripe/connect-webhook.ts` para:
1. Registrar cada evento de Stripe en `stripe_onboarding_events` (idempotente por `stripe_event_id`).
2. Actualizar `drivers.stripe_onboarding_status` según el `event_type` del evento.

No se toca el flujo de payouts ya implementado.

## Cambios

### 1. Log de eventos en `stripe_onboarding_events`

Al inicio del handler (después de parsear el JSON y antes del `switch`):

- Leer `event.id` del payload.
- Resolver `driver_id` desde `stripe_account_id`:
  - Preferir `event.account` (evento Connect).
  - Fallback: `obj.id` si el evento es `account.*`.
  - Query a `drivers` para obtener `id` por `stripe_account_id`.
- `insert` en `stripe_onboarding_events` con `{ stripe_event_id, event_type, driver_id, payload: event }`.
- Usar `.upsert(..., { onConflict: 'stripe_event_id', ignoreDuplicates: true })` para idempotencia — si el evento ya fue procesado, cortar temprano y responder 200 sin ejecutar el resto.

### 2. Actualizar `stripe_onboarding_status`

Solo aplica cuando hay `driver_id` resuelto. Mapeo por `event_type`:

- **`account.updated`**: dentro del case existente, calcular:
  - `completo` si `details_submitted && charges_enabled && payouts_enabled`.
  - `rechazado` si `requirements.disabled_reason` está presente y no es `requirements.pending_verification`.
  - `pendiente` en cualquier otro caso (cuenta creada pero incompleta).
  
  Escribir junto al `stripe_payouts_enabled` existente: `stripe_onboarding_status` y `stripe_updated_at`.

- **`account.application.authorized`** / **`capability.updated`**: setear `pendiente` si el driver no está ya en `completo`.

- **`account.application.deauthorized`**: setear `rechazado`.

- Otros eventos: no tocan status.

### 3. Sin cambios en

- Casos de `payout.*` y `transfer.failed` — quedan idénticos.
- Verificación de firma.
- Tabla / RLS de `stripe_onboarding_events` (ya existen).

## Detalles técnicos

- Toda la escritura usa `supabaseAdmin` (ya importado dinámicamente).
- El insert de log se envuelve en try/catch propio: un fallo de log NO debe romper el procesamiento del evento; se loguea a consola y se sigue.
- La respuesta sigue siendo `200 {received:true}` en éxito y `500` solo en errores no recuperables del handler principal (para reintento de Stripe).
- No hay migraciones ni cambios de types (la tabla ya existe en `types.ts`).

## Archivos

- Editar únicamente `src/routes/api/public/stripe/connect-webhook.ts`.
