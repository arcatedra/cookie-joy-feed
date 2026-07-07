# Sincronizar `stripe_onboarding_status`

Objetivo: mantener la columna `drivers.stripe_onboarding_status` alineada con la realidad de la cuenta Stripe Connect, sin cambiar nada más.

## Cambios

**Archivo único:** `src/lib/route-wallet.functions.ts`

### 1. `createStripeConnectOnboarding` (líneas ~117-138)

Al crear una cuenta Express nueva, en el mismo `update` que guarda `stripe_account_id`, agregar:

- `stripe_onboarding_status: 'pendiente'`
- `stripe_updated_at: new Date().toISOString()`

No se toca cuando la cuenta ya existía (se actualizará en el refresh).

### 2. `refreshStripeConnectStatus` (líneas ~154-187)

Tras leer la cuenta con `stripeGet /v1/accounts/{id}`:

- Calcular:
  ```ts
  const payoutsEnabled = !!acct.payouts_enabled;
  const chargesEnabled = !!acct.charges_enabled;
  const detailsSubmitted = !!acct.details_submitted;
  const status = (payoutsEnabled && chargesEnabled && detailsSubmitted)
    ? 'completo'
    : 'pendiente';
  ```
- En el `update` de `drivers`, además de `stripe_payouts_enabled`, escribir:
  - `stripe_onboarding_status: status`
  - `stripe_updated_at: new Date().toISOString()`
- Ampliar el objeto retornado a `{ connected, payouts_enabled, charges_enabled, details_submitted, onboarding_status }` para que la UI pueda mostrar el estado.

Nota: no se marca `'rechazado'` desde aquí — ese estado queda reservado para el webhook `account.updated` cuando Stripe reporte `requirements.disabled_reason`, que ya está fuera del alcance de este cambio.

## Fuera de alcance

- Cambios en la UI del repartidor (se puede ajustar después usando el nuevo campo de retorno).
- Webhook `account.updated` (ya existe en `src/routes/api/public/stripe/connect-webhook.ts`; si quieres, en un cambio siguiente lo enchufo también para actualizar `stripe_onboarding_status`).
