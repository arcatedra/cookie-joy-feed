## Objetivo

Verificar pieza por pieza que TODO el flujo del sorteo en vivo (cutoff, countdown, inscripciones, AMOE, sorteo, reclamo de premios, emails y panel admin) está realmente conectado a Supabase (Lovable Cloud) y no hay valores hardcodeados, mocks o caminos rotos.

## Alcance de la auditoría

Reviso 7 bloques. Para cada uno entrego: estado (✅ conectado / ⚠ parcial / ❌ desconectado), evidencia (RPC/tabla/columna concreta), y acción correctiva si hace falta.

### 1. Configuración del sorteo
- `sweepstakes_config` → expuesto por `get_sweepstakes_public_config` (`sponsor_address`, `entry_cutoff_minutes`, `min_age`, `claim_window_days`, `excluded_states`, `max_daily_prize_usd`).
- Consumido por `LiveDrawSection`, `ruleta.tsx` (AMOE), `sweepstakes-rules.tsx`.

### 2. Estado del sorteo y countdown
- `get_today_draw()` → `getTodayDraw` server fn → React Query (`["daily-draw"]`).
- Validar `scheduled_at` real, `status`, `prize_usd_live`, `tickets_total`, `entrants_total`, `rolled_over_from`.
- Confirmar que el banner "INSCRIPCIÓN CERRADA" y el pulse del último minuto usan el cutoff del DB (ya verificado en el último round).

### 3. Inscripción con estrellas
- Botón "Entrar al sorteo" → `enterDailyDraw` → RPC `enter_daily_draw` (descuenta `user_tokens.balance`, inserta `daily_draw_entries`, valida `TERMS_NOT_ACCEPTED`, `DRAW_CLOSED`, `INSUFFICIENT_STARS`, `SPONSOR_ADDRESS_NOT_CONFIGURED`).
- Verificar que el frontend muestra cada error traducido.

### 4. AMOE (entrada gratis)
- Form en `ruleta.tsx` → `submit_amoe_entry` (valida edad, estado, ensayo ≥100 chars, límite 3 IP/día, cutoff, dedupe por email).
- Crea fila en `amoe_entries` + `daily_draw_entries` (source='amoe').

### 5. Ejecución del sorteo + roll-over
- `run_daily_draw()` invocado por cron / `/api/public/hooks/run-daily-draw`.
- Verificar `cron.job` programado, `winner_announcements`, `winner_claims` (deadline = `claim_window_days`), excedentes a `daily_draws` del día siguiente.

### 6. Notificación al ganador
- Trigger `notify_winner_via_hook` sobre `winner_claims` → `pg_net` → `/api/public/hooks/notify-winner` (con `WINNER_NOTIFY_SECRET`).
- Inserta en `transactional_emails` / `email_send_log`.
- Confirmar `internal_hook_config` con `notify_winner_url` + `notify_winner_secret` poblados.

### 7. Reclamo + panel admin
- `winner-documents` bucket (privado) para W-9/ID.
- `winner_claims` columnas admin (`admin_notes`, `verified_at/by`, `rejected_at/by`, `paid_by`).
- Server fns `getWinnerClaimDetails`, `verifyClaim`, `rejectClaim`, `markPaid` con `has_role('admin')`.
- Ruta `/admin/sweepstakes/winners` operativa.

## Lo que ejecuto

Solo lecturas — sin migraciones ni cambios de datos:
- `SELECT` en `pg_proc`, `cron.job`, `internal_hook_config`, `sweepstakes_config`, `storage.buckets`, `email_send_log`.
- Smoke HTTP a `/api/public/hooks/run-daily-draw` (dry/no-op) y revisión de logs.
- Lectura de los archivos `*.functions.ts` para confirmar que cada hook del frontend apunta al RPC correcto.

## Entregable

Tabla con los 7 bloques + lista corta de findings accionables (p. ej. "falta cron job", "trigger ausente", "hook secret vacío"). Si todo verde, una nota explícita y un mini-script de regresión que puedas reusar.

## Lo que NO toco en esta auditoría

- No modifico `sweepstakes_config` (cutoff, sponsor, etc.).
- No despliego migraciones nuevas (salvo que el audit revele un trigger faltante, en cuyo caso te lo propongo aparte).
- No envío emails reales (eso lo hicimos en el smoke test #4).