## Sincronización completa de pagos con Stripe

Actualmente los retiros funcionan de forma síncrona: cuando el repartidor pide un retiro, llamamos a Stripe y guardamos el estado inicial (`procesando`). Pero Stripe puede tardar minutos u horas en confirmar que el pago llegó al banco, o puede fallar después. Hoy no nos enteramos automáticamente — el estado en la tabla `driver_payouts` se queda "colgado" en `procesando`.

Para sincronizar bien necesitamos escuchar los eventos que Stripe envía cuando el estado cambia.

### 1. Webhook público para Stripe Connect

Crear la ruta `src/routes/api/public/stripe/connect-webhook.ts` (path público bypasea auth, requerido por Stripe). Verifica la firma `stripe-signature` con un secret dedicado y procesa estos eventos:

- **`payout.paid`** → marcar `driver_payouts.status = 'completado'`, sellar `paid_at`.
- **`payout.failed`** → marcar `status = 'fallido'`, guardar `failure_message`, y llamar a la RPC `reverse_failed_payout` para devolver el dinero al `available_balance` del repartidor + registrar transacción de reverso.
- **`payout.canceled`** → mismo flujo que `failed`.
- **`transfer.failed`** → si el transfer inicial platform → cuenta conectada falla, revertir también.
- **`account.updated`** (de la cuenta conectada) → actualizar `drivers.stripe_payouts_enabled` según `capabilities.transfers` y `payouts_enabled`. Esto arregla el caso de que el repartidor complete onboarding después y no tengamos que pedirle refresh manual.

Todos los updates son idempotentes (buscar por `stripe_payout_id` / `stripe_account_id`, no reprocesar si el estado ya coincide).

### 2. Secret para verificar el webhook

Stripe Connect usa un **endpoint secret distinto** al de webhooks normales. Después de crear el endpoint en el dashboard de Stripe (tipo "Connect"), guardarlo como secret `STRIPE_CONNECT_WEBHOOK_SECRET`. Pediré el valor con el flujo estándar de secretos cuando llegue el momento.

### 3. URL a configurar en Stripe

Una vez desplegado, la URL del webhook será:
`https://project--d99974e1-204d-46a0-816a-e2595eaf444a.lovable.app/api/public/stripe/connect-webhook`

Te la doy ya lista para pegar en Stripe Dashboard → Developers → Webhooks → **Add endpoint** (marcando "Connect" y suscribiéndote a los 5 eventos de arriba).

### 4. RPC de reverso (menor)

Ya existe `reverse_failed_payout` de la fase anterior; solo verifico que sea idempotente (no revertir dos veces el mismo payout si Stripe reenvía el evento).

### 5. Botón manual de "sincronizar" como respaldo

En `/admin/payouts`, un botón por fila que llame a un server function `syncPayoutStatus(payoutId)` que consulta `stripe.payouts.retrieve` y actualiza igual que el webhook. Sirve para casos donde el webhook falló o no llegó.

### Fuera de alcance

- Reconciliación periódica programada (cron) — se puede añadir después si hace falta.
- Webhooks para eventos de balance de la plataforma.

### Qué necesito de ti para empezar

1. Confirmación para implementar tal cual.
2. Después de aplicar el código, tú creas el endpoint en Stripe Dashboard (tipo Connect) y me pasas el signing secret cuando te lo pida.
