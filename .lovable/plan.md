# Plan: Sorteo Diario HAZOREX — cumplimiento y unificación

> Nota: no es asesoría legal. Antes de activar el sorteo con dinero real, un abogado especializado debe revisar la versión final. Este plan implementa la parte técnica del prompt.

## Estado actual (verificado en el código)

- Tabla existente: `public.daily_draw_entries` (columnas: draw_date, subject_user_id, subject_email, display_name, tickets, source). Ya soporta `source ∈ {'paid','amoe',...}` — es la "tabla única" pedida, no hace falta duplicarla.
- Método pago: `stars-checkout` + RPC `enter_daily_draw` inserta con `source='paid'`. 10⭐ = 1 boleto (memoria confirmada).
- Método AMOE: hoy `/amoe` es solo informativo (Mail-in). El formulario con ensayo digital ya no existe en UI. La tabla `amoe_entries` sigue en DB pero sin flujo activo.
- `sweepstakes_config` ya existe con `sponsor_address`, `excluded_states`, `min_age`, `max_daily_prize_usd`, `entry_cutoff_minutes`. Falta bandera global `sweepstakes_active`.
- Panel admin en `/ruleta`: ya se corrigió en turnos previos para exigir rol `admin` (verificar que sigue así).
- Random.org / hash verificable: `run_daily_draw` ya publica `seed_hash`. Falta confirmar la fuente pública del seed.
- Checkout: pagos en modo sandbox (Stripe). El "Shopify" del carrito es solo storefront de productos físicos, no del sorteo — clarificar en UI.

## Cambios propuestos

### 1. Bandera global `sweepstakes_active`
- Migración: agregar `sweepstakes_active BOOLEAN NOT NULL DEFAULT false` a `public.sweepstakes_config`.
- Exponerla en `get_sweepstakes_public_config()`.
- Consumirla en: home banner, `/ruleta` (LiveDrawSection + BuyTokens), `/sweepstakes-rules`, `/sorteo/ganadores`, footer.
- Cuando `false`: ocultar prize pool, últimos ganadores, contador de recaudación, botón "Girar/Comprar boletos". Mostrar tarjeta uniforme "Próximamente" en las 4 vistas.
- Guardas server-side: `enter_daily_draw` y `submitAmoeEntry` rechazan con `SWEEPSTAKES_INACTIVE` si la bandera está en `false`.

### 2. Método 1 — Comprar Estrellas → Boletos
- Confirmar en UI que "Girar la Ruleta" es solo el canje 10⭐ → 1 boleto (no un juego aparte). Actualizar copy en `/ruleta` y `/sweepstakes-rules` sección de canje.
- El registro en `daily_draw_entries` ya se genera server-side vía RPC — no cambia.
- Aclarar en el checkout que la pasarela es Stripe (sandbox actual). El drawer "Shopify" queda para productos, con un badge visible que lo distinga del flujo de estrellas.

### 3. Método 2 — AMOE gratis (Mail-in, ya vigente)
- Mantener `/amoe` como está: informativo, tarjeta postal manuscrita. Este es el AMOE legal principal.
- Reforzar la ruta admin `admin.sweepstakes` para registrar entradas AMOE recibidas por correo, insertando en `daily_draw_entries` con `source='amoe'`, `tickets=1`, respetando cutoff y bandera activa.
- Validaciones server-side al registrar AMOE por admin:
  - Edad ≥ `min_age` a partir de DOB del sobre.
  - Estado no en `excluded_states`.
  - Deduplicación por (email + draw_date) o (dirección + draw_date).
- Igual peso: mismo `tickets=1` que un boleto comprado (ya lo es).

### 4. Reglas Oficiales y textos
- Actualizar `/sweepstakes-rules`:
  - Sección de canje: "10 estrellas compradas = 1 boleto. La animación de ruleta es solo visual; no altera la probabilidad."
  - Igual peso explícito entre `paid` y `amoe`.
  - Placeholder de dirección: mostrar la real solo cuando `sweepstakes_active=true` y `sponsor_address` esté completa.

### 5. Panel de administrador
- Auditar `/ruleta`, `LiveDrawSection`, `TopNav` y confirmar que ningún control admin (TEST DRAW, seed override, etc.) se muestra sin `has_role(admin)`.
- Blindar en cliente + server (RLS). Si algo sigue expuesto, cerrarlo aquí.

### 6. Verificabilidad del sorteo
- `run_daily_draw` ya guarda `seed_hash`. Añadir en `/sorteo/ganadores` el enlace con el hash + explicación de cómo verificar (SHA-256 del seed publicado tras el sorteo).
- Random.org queda como fase futura (no bloqueante para MVP legal).

### 7. Reclamo de premio
- El flujo `winner_claims` ya existe con W-9 para premios altos. Verificar que el aviso de "premios > $600 requieren W-9" aparece en `/sweepstakes-rules` y en la página de reclamo.

### 8. Checklist antes de activar (`sweepstakes_active=true`)
- [ ] Dirección postal real cargada en `sweepstakes_config.sponsor_address`.
- [ ] Panel admin verificado (login + rol) en staging.
- [ ] Prueba end-to-end: 1 boleto pago + 1 boleto AMOE en el mismo sorteo → confirmar en DB mismo peso.
- [ ] Prize pool y ganadores muestran "Próximamente" con bandera en `false`.
- [ ] Textos consistentes en banner / reglas / formulario / footer.
- [ ] Revisión legal del abogado.

## Detalles técnicos

- **DB**: 1 migración — agrega `sweepstakes_active`, extiende `get_sweepstakes_public_config`, añade guarda en `enter_daily_draw`, RPC `admin_register_amoe_entry(email, name, dob, state, draw_date)` con validaciones.
- **Frontend**: hook `useSweepstakesActive()` consumido por home banner, `/ruleta`, `/sweepstakes-rules`, `/sorteo/ganadores`, footer.
- **No se crea** una tabla nueva `entradas_sorteo`: `daily_draw_entries` ya cumple la función. Renombrar sería un refactor destructivo sin beneficio.
- **Pagos**: mantener Stripe sandbox hasta que el usuario decida go-live; añadir label "Powered by Stripe" en el modal de estrellas para eliminar la ambigüedad con Shopify.

## Fuera de alcance (siguiente iteración)
- Integración Random.org en vivo.
- Panel público de auditoría de seeds pasados.
- Registro estatal si el premio supera $5,000.

## Pregunta abierta
¿Quieres que en el mismo turno prepare también el hardening del panel admin (segundo prompt que mencionaste), o lo dejamos como plan aparte para revisarlo primero?
