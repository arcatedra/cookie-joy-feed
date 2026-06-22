
## Objetivo
Rediseñar la sección "Compra de Estrellas" dentro de `/ruleta` con un look premium, integrar pagos reales con Stripe (Lovable Payments), y aplicar la regla 50/50: mitad va a la plataforma, mitad alimenta un Prize Pool global mostrado con contador animado.

## 1. Base de datos (migración)

Nueva tabla `prize_pool_ledger` (registro inmutable de cada aporte):
- `package_id` (text), `amount_usd` (numeric), `tokens_purchased` (int)
- `platform_share_usd`, `pool_share_usd` (numeric — split 50/50)
- `subject_user_id` (uuid, nullable), `subject_email` (text, nullable)
- `stripe_session_id` (text, unique), `created_at`
- RLS: solo `service_role` lee/escribe. GRANTs explícitos.

Vista pública `prize_pool_totals` (lectura `anon`):
- `total_pool_usd`, `total_contributions`, `last_updated`
- GRANT SELECT a `anon` y `authenticated`.

Función RPC `get_prize_pool()` (SECURITY DEFINER) que devuelve el total — la única forma en que el front lee el pozo.

## 2. Pagos (Stripe Embedded Checkout)

- Habilitar `enable_stripe_payments` + crear 3 productos/precios:
  - `stars_starter` → 10⭐ / $2
  - `stars_popular` → 30⭐ / $5
  - `stars_premium` → 100⭐ / $15
- Server fn `createStarsCheckout` (en `src/lib/stars-checkout.functions.ts`): crea sesión embedded, resuelve customer con `metadata.userId`, mete `metadata.package_id` y `metadata.subject_email` en la sesión.
- Webhook `src/routes/api/public/payments/webhook.ts` (extender el existente): en `checkout.session.completed`, verifica firma, calcula split 50/50, inserta fila en `prize_pool_ledger`, acredita estrellas al `user_tokens` del comprador.
- Modal de checkout embedded reutilizando patrón `useStripeCheckout` + `PaymentTestModeBanner` arriba.

## 3. UI — Nueva sección "Compra de Estrellas"

Reescribir `BuyTokensPanel` en `src/routes/ruleta.tsx` manteniendo paleta beige/azul/oro existente:

**Header del módulo**
- Título grande "Compra Estrellas" + subtítulo "El 50% de cada compra alimenta el Prize Pool global".
- Banner Prize Pool: card oscura ancha con
  - "POZO ACUMULADO GLOBAL" en oro
  - Cifra `$XX,XXX.XX USD` con contador animado (cuenta atrás/arriba usando `requestAnimationFrame`, easing easeOutExpo)
  - Polling vía React Query cada 15s al RPC `get_prize_pool`
  - Ícono estrella + brillo pulsante

**3 tarjetas de paquetes** (grid responsivo)
- Glassmorphism sutil sobre beige, bordes redondeados 24px, sombra suave
- Estado hover: lift + brillo dorado en el borde
- Tarjeta **Popular** (centro):
  - Escala 1.05, badge "MÁS POPULAR" flotante con gradiente oro
  - Borde animado (gradient sweep) y resplandor dorado
  - Etiqueta "Mejor valor +20%"
- Cada card muestra:
  - Pictograma estrella grande
  - Cantidad de estrellas (tipografía display 48px)
  - Precio USD prominente
  - Línea micro: "$X.XX → Prize Pool" (transparencia del split)
  - Botón "COMPRAR" sólido azul → abre embedded checkout
- Animación de entrada staggered (fade + slide up)

**Footer legal del módulo**
- Tira oscura discreta con 3 enlaces:
  - Términos y Condiciones → `/terms`
  - Reglas Oficiales del Sorteo → `/sweepstakes-rules`
  - Participación Gratuita (No Purchase Necessary) → ancla `#amoe` a la sección AMOE ya existente
- Disclaimer corto: "No se requiere compra. Nulo donde la ley lo prohíba. Mayores de 18 años."

Crear páginas placeholder `/terms` y `/sweepstakes-rules` con estructura legal básica (texto editable luego).

## 4. Detalles técnicos clave

- Split se calcula en el webhook (no en cliente) usando `amount_total` real de Stripe.
- Idempotencia: `stripe_session_id UNIQUE` en `prize_pool_ledger` evita doble acreditación.
- El contador anima desde el último valor conocido al nuevo valor (no desde 0) usando `useRef` para memorizar valor previo.
- No tocar nada fuera de: `src/routes/ruleta.tsx`, nuevos archivos `stars-checkout.functions.ts`, webhook, migración, y nuevas rutas legales.

## Archivos a crear/editar
- ➕ `supabase/migrations/<ts>_prize_pool.sql`
- ➕ `src/lib/stars-checkout.functions.ts`
- ➕ `src/components/PrizePoolCounter.tsx`
- ➕ `src/components/StarsCheckoutModal.tsx`
- ➕ `src/routes/terms.tsx`, `src/routes/sweepstakes-rules.tsx`
- ✏️ `src/routes/ruleta.tsx` (reemplazar `BuyTokensPanel`)
- ✏️ `src/routes/api/public/payments/webhook.ts` (rama `stars_*`)
- ✏️ `src/lib/roulette-config.ts` (priceId por paquete)
