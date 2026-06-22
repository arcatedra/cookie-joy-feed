# Plan: Bloqueantes legales para operar el sorteo en EE.UU.

Objetivo: dejar el sorteo legalmente operable en Estados Unidos antes de tocar nada más. Esto cubre los 5 bloqueantes que la ley federal y estatal exige para un "sweepstakes" con premio en efectivo.

## 1. AMOE real (Alternative Method of Entry) — "No Purchase Necessary"

Hoy `submitAmoeEntry` existe pero no inserta tickets reales en `daily_draw_entries` con el mismo peso que las entradas pagadas. Eso invalida el sorteo legalmente.

**Cambios:**
- Nueva tabla `amoe_entries` (si no tiene los campos correctos): nombre completo, dirección postal completa, email, fecha de nacimiento, estado de residencia, IP, user_agent, fecha de envío, draw_date asignado.
- Función RPC `submit_amoe_entry(...)` que:
  - Valida edad ≥18 y residencia en EE.UU. (excluye estados restringidos: RI, FL>5k, NY>5k → por ahora bloquear FL, NY, RI hasta tener bonding).
  - Límite: 1 entrada AMOE gratis por persona por día (por email + por dirección postal + por IP).
  - Inserta 1 ticket en `daily_draw_entries` con `tickets=1`, mismo peso que un ticket pagado, marcado con `source='amoe'`.
- Página pública `/amoe` (o sección anclada) con formulario postal-equivalente: explica las dos vías (carta física + formulario web), reglas, límites.
- Texto legal visible: "NO PURCHASE NECESSARY. A PURCHASE WILL NOT INCREASE YOUR CHANCES OF WINNING."

## 2. Verificación de elegibilidad del ganador

Antes de pagar el premio se debe verificar:
- Edad ≥18 (o ≥21 en MS, NE).
- Residente legal de EE.UU.
- No ser empleado, contratista ni familiar directo del operador.
- No estar en estados excluidos.

**Cambios:**
- Nueva tabla `winner_claims`: draw_date, user_id, status (`pending_verification` | `verified` | `rejected` | `paid` | `expired`), full_name, address, dob, state, id_document_url (Supabase Storage privado), w9_url, claim_deadline, paid_at, payment_reference, rejection_reason.
- Flujo: al ejecutar `run_daily_draw`, se crea automáticamente una fila `winner_claims` con `status='pending_verification'` y `claim_deadline = now() + 14 días`.
- Página `/_authenticated/claim/$drawDate` donde el ganador sube ID + W-9 (obligatorio para premios >$600 IRS) + confirma dirección.
- Solo admin puede marcar `verified` / `rejected` / `paid` desde un panel admin.

## 3. Notificación automática al ganador

Hoy solo se muestra en UI. Si el ganador no abre la app, pierde el premio sin saberlo → riesgo legal.

**Cambios:**
- Nueva plantilla de email `winner-notification.tsx` (app email, no marketing): felicitaciones, link único al claim, deadline de 14 días, qué documentos necesita.
- En `run_daily_draw` (o en el endpoint `/api/public/hooks/run-daily-draw`): después de seleccionar ganador, encolar email vía `enqueue_email`.
- Recordatorio automático a los 7 días y 13 días si `status='pending_verification'`.
- Si pasa el deadline → `status='expired'`, el premio rueda al siguiente sorteo (rollover).

## 4. Términos legales obligatorios (Official Rules + AMOE + Terms)

Las páginas `terms.tsx` y `sweepstakes-rules.tsx` ya existen. Hay que asegurar que contengan **todas las cláusulas exigidas por FTC + estados**:

- Sponsor: nombre legal completo, dirección física.
- Periodo de elegibilidad y método de selección.
- Valor aproximado del premio (ARV) y forma de pago (Stripe payout, PayPal, cheque).
- Probabilidades ("Odds of winning depend on number of eligible entries received").
- Estados excluidos explícitos.
- Cláusula AMOE completa con dirección postal.
- Tax responsibility del ganador (1099-MISC si >$600).
- Releases of liability.
- Privacy policy y manejo de datos.
- Disputa: arbitraje, jurisdicción.
- Winner list disponible bajo solicitud.

Revisar las dos páginas existentes y rellenar lo que falte (vamos a necesitar que confirmes el **nombre legal de la empresa y dirección física registrada** para el Sponsor block).

## 5. Cierre de entradas + ventana de seguridad

Hoy las entradas pueden entrar hasta las 8:00 PM ET en el momento del sorteo → race condition legal.

**Cambios:**
- Función `enter_daily_draw` valida ahora que `now() < scheduled_at - interval '5 minutes'` (cierra a 19:55 ET).
- Estado intermedio `closed` entre 19:55 y 20:00 antes del `drawing`.
- UI muestra contador "Entradas cierran en X min" desde las 19:30.

## Lo que NO entra en este plan (para después)

- Stripe webhook idempotente y prize pool (próximo plan, ya identificado).
- State bonding NY/FL (requiere abogado + dinero real, no es código).
- Anti-fraude avanzado (device fingerprint, etc).
- Public winner verification con commit-reveal.

## Detalles técnicos

- Migración SQL: nuevas tablas `amoe_entries` (si falta columnas), `winner_claims`; nuevas funciones `submit_amoe_entry`, modificaciones a `enter_daily_draw` y `run_daily_draw`; políticas RLS + GRANTs.
- Storage: bucket privado nuevo `winner-documents` con RLS (solo el ganador y service_role).
- Email template `winner-notification` registrado en `email-templates/registry.ts`.
- Cron adicional para recordatorios de claim (pg_cron diario que revisa `winner_claims` con `status='pending_verification'`).
- Frontend: página `/amoe`, página `/_authenticated/claim/$drawDate`, panel admin de claims.

## Preguntas que necesito antes de implementar

1. **Sponsor legal**: nombre legal exacto de la empresa y dirección física registrada (para Official Rules).
2. **Método de pago del premio**: ¿Stripe payout, PayPal, cheque físico, o varios? Esto define qué datos pide el formulario de claim.
3. **Estados excluidos**: ¿bloqueamos FL, NY, RI desde día 1, o solo cuando el pool supere $5k?
4. **¿Quieres que avancemos los 5 bloqueantes juntos en una sola tanda, o los partimos (ej. primero AMOE + cierre de entradas, luego claim flow + emails, luego Official Rules)?**
