# Plan: Ruleta ORIGEN (Sweepstakes)

Sección totalmente nueva en `/ruleta`. No toca tienda, perfil ni estilos globales — solo añade archivos nuevos + migración + 1 entrada de nav opcional.

## 1. Base de datos (migración nueva)

Tablas nuevas en `public` (con GRANT y RLS):

- **`user_tokens`** — saldo por usuario o por email-invitado.
  - `id uuid pk`, `user_id uuid null` (FK auth.users), `guest_email text null`, `balance int default 0 check >=0`, `created_at`, `updated_at`.
  - Constraint: exactamente uno de `user_id` / `guest_email` no nulo. Unique en cada uno.
- **`spin_history`** — cada giro.
  - `id`, `user_id null`, `guest_email null`, `prize_key text`, `prize_label text`, `coupon_code text null`, `tokens_spent int default 10`, `created_at`.
- **`amoe_entries`** — formulario legal AMOE (1 por email, anti-duplicado).
  - `id`, `user_id null`, `email text unique`, `full_name`, `phone`, `essay text check(length(essay)>=300 chars equivalentes)`, `ip inet`, `created_at`.
- **`mission_claims`** — misiones reclamadas (1 por misión por email/usuario).
  - `id`, `user_id null`, `guest_email null`, `mission_key text` (`tiktok`|`instagram`|`facebook`), `tokens_awarded int`, `created_at`. Unique (subject, mission_key).
- **`spin_coupons`** — códigos canjeables únicos generados al ganar.
  - `id`, `code text unique`, `prize_key`, `subject_user_id null`, `subject_email null`, `redeemed_at null`, `created_at`.

Todo con RLS: el usuario logueado solo ve sus filas (`auth.uid()`); las operaciones críticas (sumar tokens, gastar tokens, otorgar premio, crear cupón) se hacen vía **server functions** con `supabaseAdmin` cargado dentro del handler, nunca desde el cliente.

Función SQL `spend_tokens(subject, amount)` y `add_tokens(subject, amount, reason)` atómicas para evitar carreras.

## 2. Server functions (`src/lib/roulette.functions.ts`)

Todas con validación Zod. Soportan dos sujetos: usuario logueado (vía `requireSupabaseAuth`) o invitado identificado por email + token de sesión firmado (cookie httpOnly establecida al completar AMOE).

- `getBalance()` — devuelve saldo + historial reciente.
- `submitAmoeEntry({name,email,phone,essay})` — valida ensayo ≥300 palabras, crea `amoe_entries`, otorga +1 token, setea cookie de sesión guest.
- `claimMission({mission})` — verifica que no exista claim previo, suma 3 tokens.
- `spin()` — atómico: descuenta 10, elige premio con pesos predefinidos en servidor (no en cliente), inserta `spin_history`, genera `spin_coupons.code` cuando aplique, devuelve `{prizeIndex, prizeLabel, couponCode?}` para que la animación del cliente termine en el sector correcto.
- `createTokenCheckout({packageId})` — Stripe Checkout vía `createStripeClient` (gateway). Paquetes: 10/$2, 30/$5, 100/$15. Webhook existente extendido o nuevo `/api/public/payments/roulette-webhook` que acredita tokens al completarse el pago.

## 3. Frontend (`src/routes/ruleta.tsx` + componentes en `src/components/roulette/`)

- `RuletaPage` — layout premium beige + azul elegante + textura madera marrón, logo estrella ORIGEN.
- `WheelCanvas` — SVG con 8 sectores (Framer Motion `rotate`), animación fluida de 4-5s con `easeOut`. Sin flechas genéricas: marcador superior tipo gema dorada minimalista.
- `TokenBalance` — chip estrella + número, actualiza vía React Query invalidate.
- `SpinButton` — deshabilitado si `balance < 10`.
- `BuyTokensPanel` — tres tarjetas de paquetes → Stripe Checkout.
- `AmoeLink` — bajo los paquetes: "¿No quieres comprar Estrellas? Participa gratis aquí".
- `AmoeDialog` — flujo 2 pasos:
  - **Paso 1**: formulario (nombre, email, teléfono, textarea con contador de palabras 0/300, botón solo activo en ≥300). Submit → +1 token, avanza a paso 2.
  - **Paso 2**: tres `MissionCard` (TikTok 60s, Instagram 45s, Facebook 30s).
    - Click "Ver/Seguir" → `window.open(url,'_blank')` + arranca countdown (estado por misión, persistido en `sessionStorage` para sobrevivir refresh).
    - Botón "Reclamar +3" bloqueado hasta `secondsLeft===0`.
    - Claim → server function, suma tokens, marca misión completada.
  - Indicador "Progreso: X/10 ⭐" siempre visible. Al llegar a 10, CTA "Cerrar y girar".
- `PrizeModal` — muestra premio + código canjeable copiable.

URLs sociales: como no se dieron, quedan en `src/lib/roulette-config.ts` como constantes `TIKTOK_URL`, `INSTAGRAM_URL`, `FACEBOOK_URL` con placeholders `#` y comentario para que el usuario las edite en un mensaje.

## 4. Diseño

Tokens nuevos añadidos solo en `src/styles.css` con prefijo `--roulette-*` para no afectar la tienda:
- `--roulette-beige: oklch(0.94 0.02 80)`
- `--roulette-blue: oklch(0.38 0.08 250)`
- `--roulette-wood: oklch(0.32 0.05 50)` + textura SVG ruido sutil
- `--roulette-gold: oklch(0.82 0.14 85)` para acentos premio
Tipografía existente del proyecto. Totalmente responsive (rueda escala con `clamp()`, paneles en columna en móvil).

## 5. Integración

- Nueva ruta `/ruleta` (archivo `src/routes/ruleta.tsx`). Pública (permite invitados).
- Opcional: enlace en `TopNav` con icono estrella → `/ruleta`. (Lo añado si lo confirmas; por defecto **no** modifico TopNav para respetar tu petición de no tocar nada existente.)
- i18n: claves nuevas bajo `roulette.*` en los 5 idiomas.

## 6. Anti-abuso

- Server-side: rate-limit por IP en `submitAmoeEntry` (max 1/email, max 3/IP/día) y en `spin` (max 1 spin cada 2s).
- Cookies `httpOnly` firmadas para sesión guest; el cliente nunca puede inflar su saldo.
- Pesos de premios y validación de tiempo de misión 100% en servidor (el countdown del cliente es UX; el servidor verifica `now - mission_started_at >= duración` usando timestamp guardado al abrir el enlace).

## Detalles técnicos

- `createStripeClient` desde `@/lib/stripe.server` (gateway, nunca SDK directo).
- `supabaseAdmin` solo dentro de `.handler()` con `await import(...)`.
- React Query para `getBalance` con invalidate tras cada mutación.
- Framer Motion para giro; cálculo de ángulo final = `360*nVueltas + (360 - (prizeIndex*sectorAngle) - sectorAngle/2)`.
- Generación de código cupón: `nanoid(10)` mayúsculas, prefijo `ORG-`.

¿Confirmas para implementar? Si quieres que añada el link en TopNav o que use URLs sociales específicas, dímelo y lo incluyo.