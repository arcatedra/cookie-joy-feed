# Checkout propio con Stripe — sin comisión de Shopify

Entendido: vamos por el camino **B** y lo hacemos por fases para no gastar créditos de golpe. Esta es la **Fase 1**: dejar el checkout cobrando de verdad con Stripe, guardando el pedido en tu BD y mandando email de confirmación. Catálogo y demás siguen como están — solo cambia cómo se cobra.

## Lo que ya tienes y vamos a reutilizar

- Stripe ya está conectado (lo usas para las Estrellas de la ruleta vía `createStarsCheckout`).
- Helper `createStripeClient` en `src/lib/stripe.server.ts` con la firma del gateway de Lovable.
- Carrito local en `src/lib/cart.tsx` (`useCart`) — items con `id`, `name`, `price`, `image`, `qty`.
- Webhook ya existe en `src/routes/api/public/payments/webhook.ts` con verificación de firma — solo añadimos un handler nuevo para pedidos.
- Emails: ya hay `src/lib/email-templates/order-confirmation.tsx` y el sistema de cola.

## Lo que voy a construir en Fase 1

### 1. Tabla `orders` en la BD

```text
orders
├── id (uuid)
├── stripe_session_id (text, unique)
├── stripe_payment_intent_id (text, nullable)
├── user_id (uuid, nullable → auth.users)
├── email (text)
├── items (jsonb)            -- snapshot del carrito
├── subtotal_usd (numeric)
├── shipping_usd (numeric)
├── tax_usd (numeric)
├── total_usd (numeric)
├── currency (text, default 'usd')
├── shipping_address (jsonb) -- nombre, calle, ciudad, zip, país, teléfono
├── status (text)            -- 'pending' | 'paid' | 'failed' | 'refunded'
├── environment (text)       -- 'sandbox' | 'live'
├── tracking_number (text, nullable)
├── created_at, updated_at, paid_at
```

Con RLS: el usuario ve solo sus pedidos (por `user_id` o por email si fue invitado); `service_role` puede todo. GRANT a `authenticated` y `service_role`.

### 2. Server function `createCartCheckout`

Nuevo archivo `src/lib/cart-checkout.functions.ts`. Hace:

- Valida con Zod los items, email y dirección.
- Resuelve el usuario por bearer token (igual que `stars-checkout`) o lo trata como invitado.
- Crea una sesión Stripe (`mode: 'payment'`, `ui_mode: 'embedded_page'`) con:
  - `line_items` construidos con `price_data` desde el carrito (cada galleta = un line).
  - `shipping_address_collection` con países permitidos (te pregunto cuáles abajo).
  - `shipping_options` con un par de tarifas planas (estándar y exprés — usamos los valores que ya muestras en `/cart`).
  - `automatic_tax: { enabled: true }` (fallback por defecto; full compliance lo dejamos para Fase 2 cuando sepas seller country).
  - `metadata.kind = 'cookie_order'`, `subject_user_id`, `subject_email`.
  - `payment_intent_data.description = "HAZOREX — Pedido de galletas"`.
- Inserta el pedido en `orders` con `status: 'pending'`.
- Devuelve `clientSecret` para Embedded Checkout.

### 3. Reemplazar el botón fake en `/cart`

Borrar el `setTimeout(1400)` + `setConfirmed(true)`. En su lugar:

- Validar dirección.
- Llamar `createCartCheckout`.
- Montar `<EmbeddedCheckoutProvider>` + `<EmbeddedCheckout>` en un panel/modal sobre la página.
- `return_url` → `/checkout/success?session_id={CHECKOUT_SESSION_ID}`.

### 4. Página `/checkout/success`

Nueva ruta `src/routes/checkout.success.tsx`:

- Lee `session_id` del query.
- Server function `getOrderBySessionId` que verifica que pertenece al usuario (o al email del invitado) y devuelve resumen.
- Muestra: número de pedido, items, total, dirección de envío, "Te enviamos un email a X".
- CTA: "Ver mis pedidos" → `/historial`, "Seguir comprando" → `/shop`.

### 5. Webhook: handler para `checkout.session.completed`

En `src/routes/api/public/payments/webhook.ts` añado una rama nueva (sin tocar la de suscripciones ni estrellas):

- Si `event.type === 'checkout.session.completed'` y `metadata.kind === 'cookie_order'`:
  - Marca el pedido como `paid` (idempotente con `stripe_session_id`).
  - Guarda `payment_intent_id`, totales finales, dirección recogida por Stripe.
  - Encola `order-confirmation` con `idempotencyKey = order:${session.id}`.
  - Encola también un email interno para ti (`admin-new-order`, ya existe la plantilla).

### 6. Empty state del carrito

Cuando `items.length === 0` y el usuario llega a `/cart`: tarjeta con icono + "Tu carrito está vacío" + CTA "Ver galletas" → `/shop`. Tres líneas, sin más.

## Lo que NO hago en Fase 1 (para no quemar créditos)

- Tax codes por producto en Stripe — usamos `automatic_tax` global. Lo afinamos cuando vayas a live.
- Cálculo de envío real por peso/destino — tarifas planas por ahora.
- Migrar el catálogo fuera de Shopify — los productos siguen viniendo del Storefront API, solo cambia el cobro.
- Reembolsos / cancelaciones desde la app — desde el dashboard de Stripe por ahora.
- Inventario / stock — Shopify lo sigue mostrando; en Fase 2 movemos a una tabla `products` propia si quieres salir de Shopify del todo.
- Página `/historial` reconstruida — solo añado lectura básica de `orders` si hace falta para el CTA.

## Antes de empezar necesito 3 datos tuyos

(Pregunto abajo con el botón.)

## Verificación al final

- Tarjeta test `4242 4242 4242 4242` → pago real con sandbox.
- Confirmar: pedido en BD con `status='paid'`, email recibido, redirección a `/checkout/success` con resumen correcto.
- Tarjeta de rechazo `4000 0000 0000 0002` → confirmar que NO se marca como pagado.
- Recargar la página de éxito directamente con un `session_id` de otro usuario → debe denegar.

## Fases siguientes (cuando lo pidas)

- **Fase 2**: tax codes por producto + decidir managed_payments según tu país.
- **Fase 3**: tabla `products` propia + admin para subir galletas sin Shopify.
- **Fase 4**: panel de pedidos / tracking / reembolsos desde la app.
