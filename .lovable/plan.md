## Objetivo

Cuando un usuario **no autenticado** pulsa "Comprar ahora" en `/ruleta`, en lugar de mostrar el error *"Inicia sesión o completa el formulario de participación gratuita primero"*, redirigirlo automáticamente a `/auth` y, tras iniciar sesión, devolverlo a `/ruleta` para que pueda completar la compra.

## Cambios

### 1. `src/routes/ruleta.tsx` — manejador del botón "Comprar ahora"
- Antes de llamar a `createStarsCheckout`, comprobar si hay sesión (`useAuth()` / `supabase.auth.getUser()`).
- Si **no hay sesión**: `navigate({ to: '/auth', search: { redirect: '/ruleta' } })` y mostrar un toast amable ("Inicia sesión para comprar estrellas").
- Si **hay sesión**: flujo actual (abrir Stripe Embedded Checkout con Apple Pay / Google Pay / tarjeta).

### 2. `src/routes/auth.tsx` — soporte de `?redirect=`
- Leer el parámetro `redirect` con `validateSearch`.
- Tras login exitoso (email o Google), `navigate({ to: redirect ?? '/' })`.

### 3. Higiene UX (mínima)
- Mantener el mensaje del servidor como red de seguridad (por si llaman la función directamente), pero la UI ya no debería disparar ese error.

## Lo que NO se toca
- Flujo de reclamo del ganador (entrega manual confirmada).
- Lógica de Stripe / webhooks / sweepstakes.
- AMOE / participación gratuita.
- Cron del sorteo.

## Resultado

Usuario nuevo → pulsa "Comprar ahora" → `/auth?redirect=/ruleta` → login con Google (1 clic) → vuelve a `/ruleta` → pulsa "Comprar ahora" → Stripe abre con Apple Pay / Google Pay / tarjeta → paga → estrellas acreditadas.
