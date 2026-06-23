# Auditoría anti-borrado masivo + protecciones

Tu preocupación es legítima. Lo que le pasó a tu amigo normalmente ocurre por una de estas tres cosas:

1. La `SERVICE_ROLE_KEY` (que ignora RLS) se filtró al frontend o a un repo público.
2. Una tabla quedó sin RLS o con una policy DELETE demasiado abierta.
3. Un endpoint público permitía borrar/modificar sin autenticación.

Este plan revisa los tres frentes y añade tres capas de defensa para que un borrado masivo sea **imposible incluso si alguien entra con credenciales de un usuario**.

## Fase 1 — Auditoría (solo lectura, sin cambios)

Revisar y reportarte:

1. **Policies DELETE existentes** en todas las tablas de `public`. Detectar cualquier `USING (true)`, `TO anon`, o sin `WHERE auth.uid()`.
2. **Tablas sin RLS habilitada** en `public`.
3. **Uso de `supabaseAdmin` / service_role** en el código: confirmar que NUNCA se importa desde componentes del navegador y que cada handler que lo usa verifica caller (rol admin o secreto compartido).
4. **Endpoints `/api/public/*`**: confirmar que todos los que escriben/borran tienen candado (Bearer/HMAC/firma). Ya endurecimos `backup-csv`, `notify-winner`, `run-daily-draw`, `webhook` — verificar también `domain-check`, `test-draw-tick` y los de `/lovable/email/*`.
5. **Permisos de Storage** en los buckets `reels`, `winner-documents`, `backups`: ¿quién puede borrar objetos?
6. **`SUPABASE_SERVICE_ROLE_KEY` no aparece** en `src/`, `public/`, `.env*` versionados, ni en el bundle del navegador.

Entregable: un reporte resumido con un "🔴/🟢" por cada punto.

## Fase 2 — Endurecimiento (3 capas de defensa)

### Capa A — Quitar el DELETE público

- Revocar `DELETE` sobre todo `public.*` a los roles `anon` y `authenticated` por defecto (`REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated`).
- Donde un usuario sí debe poder borrar lo suyo (ej. borrar su propio comentario, su propia rating), volver a otorgar `DELETE` y dejar una policy estricta `auth.uid() = user_id`.
- Resultado: aunque alguien encuentre la clave anon, **no puede borrar nada** vía la Data API.

### Capa B — Trigger anti borrado masivo

Crear un trigger `BEFORE DELETE` en las tablas críticas (`profiles`, `donations`, `subscriptions`, `winner_claims`, `daily_draws`, `daily_draw_entries`, `winner_announcements`, `prize_pool_ledger`, `sweepstakes_config`, `user_tokens`) que:

- Cuente cuántas filas se están borrando en la sesión.
- Si en un mismo statement se intentan borrar más de N filas (ej. 50), **aborta** con `RAISE EXCEPTION 'BULK_DELETE_BLOCKED'`.
- Loggea el intento en una tabla `security_audit_log`.

Esto detiene incluso un ataque con `service_role` por accidente (ej. un admin que se equivoca de WHERE). Solo se puede saltar usando `SET LOCAL` que la app nunca emite.

### Capa C — Soft delete + retención

Para las 4 tablas más sensibles (`donations`, `subscriptions`, `winner_claims`, `profiles`):

- Añadir columna `deleted_at TIMESTAMPTZ` y forzar UPDATE en vez de DELETE desde la app.
- Trigger que convierte cualquier DELETE en un UPDATE `SET deleted_at = now()` (excepto si la sesión es `service_role` ejecutando explícitamente un job de purga).
- Las queries normales filtran por `deleted_at IS NULL` automáticamente.
- Tabla `_archive` para retener los borrados durante 30 días antes de la purga real.

### Capa D — Backups verificables (ya existe, reforzar)

- Ya tienes backups CSV diarios al bucket `backups` (con candado nuevo).
- Añadir: retención de **30 días** (purga automática) y un job semanal que sube una copia comprimida a un prefijo `weekly/`.
- El bucket `backups` queda restringido para que ningún rol que no sea `service_role` lo pueda LISTAR ni BORRAR (solo el admin verifica desde el panel Cloud).

## Cómo te lo entrego

Primero ejecuto la **Fase 1** y te paso el reporte. Sin tocar nada. Tú decides qué partes de la Fase 2 aplicar — algunas pueden romper flujos legítimos (ej. si tu app permite a un usuario eliminar su cuenta, hay que conservar ese flujo).

## Lo que **ya** te protege hoy

- `service_role` no está en el bundle del cliente (solo se lee con `process.env` desde server functions).
- Todas las tablas tienen RLS habilitada (todas las que vimos en el security scan).
- Los hooks internos ya tienen candado Bearer dedicado.
- Tienes backups CSV diarios automáticos.

Lo que falta es la **Capa A + B + auditoría** para que sea matemáticamente imposible borrar la base, no solo "improbable".
