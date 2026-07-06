## Retiros instantáneos para repartidores

Sistema tipo "Instant Pay": cada ruta completada acredita el saldo del repartidor; puede retirar cuando quiera (mín $10, parcial permitido) a su tarjeta de débito vía Stripe Connect Express Instant Payouts. La comisión de Stripe (~1.5% + $0.50) la paga el repartidor.

### 1. Base de datos (una sola migración)

**Nuevas tablas**
- `driver_wallets` — caché de saldo por repartidor: `available_balance`, `pending_balance`, `lifetime_earnings`, `updated_at`. PK = `driver_id`.
- `wallet_transactions` — libro mayor append-only: `type` (`ganancia_ruta`|`retiro`|`ajuste_admin`|`reversion`), `amount` (signed), `route_id`, `payout_id`, `description`. Índice por `(driver_id, created_at desc)`.
- `driver_payouts` — solicitudes de retiro: `amount_requested`, `fee`, `amount_net`, `status` (`procesando`|`completado`|`fallido`), `stripe_payout_id`, `stripe_error`, `requested_at`, `completed_at`. (No usamos `driver_instant_payouts` existente — su esquema no cuadra con este flujo.)

**Columnas nuevas en `drivers`**
- `stripe_account_id` (text, nullable) — cuenta Express conectada
- `stripe_payouts_enabled` (bool) — capability confirmada

**Trigger de acreditación automática**
En `delivery_routes` AFTER UPDATE cuando pasa a `completada` con `driver_id` no nulo:
1. Inserta fila en `wallet_transactions` (`type='ganancia_ruta'`, monto = `fixed_pay`).
2. Upsert `driver_wallets` sumando `available_balance` y `lifetime_earnings`.

**RPC `request_driver_payout(p_amount numeric)`** (SECURITY DEFINER, corre como el repartidor):
- Bloquea la fila `driver_wallets` (`FOR UPDATE`).
- Valida: monto ≥ $10, ≤ `available_balance`, sin `driver_payouts` en estado `procesando` para ese repartidor.
- Descuenta `available_balance` en el acto.
- Crea `driver_payouts` (`status='procesando'`) y `wallet_transactions` (`type='retiro'`, monto negativo).
- Devuelve la fila `driver_payouts`. La transferencia real la dispara el server function.

**RPC `reverse_failed_payout(p_payout_id uuid)`** para revertir cuando Stripe falla: regresa fondos, marca `fallido`, inserta `wallet_transactions` (`type='reversion'`).

**RLS**
- `driver_wallets`, `wallet_transactions`, `driver_payouts`: repartidor ve solo lo suyo; admins ven todo (`has_role admin`).
- Ninguna escritura directa desde cliente — todo pasa por RPC/server functions.

**GRANTs** a `authenticated` y `service_role` en cada tabla nueva.

### 2. Server functions (TanStack, `createServerFn` + `requireSupabaseAuth`)

Archivo nuevo `src/lib/wallet.functions.ts`:
- `getMyWallet` — saldo + últimas 50 transacciones + últimos 20 payouts.
- `createStripeConnectOnboarding` — crea/recupera cuenta Express y devuelve URL de onboarding (`stripe.accountLinks.create`). Persiste `stripe_account_id`.
- `refreshStripeConnectStatus` — sincroniza `stripe_payouts_enabled` desde Stripe.
- `requestInstantPayout({ amount })`:
  1. Verifica `stripe_payouts_enabled`.
  2. Calcula `fee = ceil(amount * 0.015 * 100)/100 + 0.50`, `net = amount - fee` (rechaza si `net ≤ 0`).
  3. Llama `request_driver_payout` RPC (reserva fondos).
  4. Crea `stripe.transfers.create` (plataforma → cuenta conectada) por `net`, luego `stripe.payouts.create` con `method: 'instant'` en la cuenta conectada.
  5. Éxito: actualiza `driver_payouts` a `completado` + `stripe_payout_id`. Fallo: llama `reverse_failed_payout` RPC.
- `adminListPayouts` — lista todos los payouts + agregado de saldo pendiente global.

**Stripe SDK**: BYOK vía `enable_stripe`. Cliente directo con `STRIPE_SECRET_KEY` (no el gateway de payments seamless — Connect no se puede rutear por ahí). SDK ya instalado si el proyecto tuvo Stripe antes; si no, `bun add stripe`.

### 3. UI repartidor — `/repartidor/wallet` (existe, se rediseña)

Layout:
```text
┌─────────────────────────────────────┐
│  Saldo disponible                   │
│  $124.50            [Retirar ahora] │
│  Total histórico: $2,340.00         │
└─────────────────────────────────────┘

[Aviso si Stripe Connect no está conectado → botón "Conectar cuenta bancaria"]

Retiros recientes
 · 06 nov · $50.00 · Completado
 · 04 nov · $30.00 · Procesando

Movimientos
 · +$8.50   Ruta #A3F2 completada  · hace 2h
 · −$50.00  Retiro instantáneo      · ayer
 · +$12.00  Ruta #B771 completada  · ayer
```

Modal "Retirar ahora":
- Input de monto (default = saldo disponible, min 10, max saldo).
- Muestra desglose: `Solicitas $X · Comisión $Y · Recibirás $Z`.
- Botón deshabilitado si hay payout en `procesando` o saldo < $10 o sin Stripe conectado.
- Al confirmar, llama `requestInstantPayout`, muestra toast y refresca.

### 4. UI admin — `/admin/repartidores` o nueva `/admin/payouts`

Tabla de todos los `driver_payouts` (últimos 100) con filtros por estado. Card superior con "Saldo pendiente total" (suma de `available_balance` en `driver_wallets`).

### 5. Secretos necesarios

Después de aprobar la migración pediré:
- `STRIPE_SECRET_KEY` (BYOK con Connect habilitado en el dashboard de Stripe).

El usuario debe activar Stripe Connect en su dashboard y elegir "Express" antes de que el onboarding funcione.

### Orden de implementación

1. Migración (tablas + trigger + RPCs + RLS + GRANTs).
2. Solicito `STRIPE_SECRET_KEY`.
3. `wallet.functions.ts` con onboarding + payout.
4. Rediseño `/repartidor/wallet`.
5. Vista admin.

### Fuera de alcance (para después)

- Webhooks de Stripe (`payout.paid`, `payout.failed`) para reconciliar el estado — v1 confía en la respuesta síncrona; v2 agrega webhooks.
- Métodos alternos (transferencia ACH multi-día). Solo Instant a débito por ahora.
- Reconciliación periódica saldo vs. ledger (script admin manual disponible con la RPC de reverse).
