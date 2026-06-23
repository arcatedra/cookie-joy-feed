## Capas extra de seguridad — Panel admin + Alerta email + Soft delete

### 1. Panel admin de seguridad (`/admin/security`)

- Ruta protegida bajo `_authenticated/`, con `beforeLoad` que comprueba `has_role(uid, 'admin')`; si no, redirige a `/`.
- Tres tarjetas:
  - **Intentos de borrado bloqueados** — últimos 50 registros de `security_audit_log` (evento, tabla, filas, rol, fecha).
  - **Estado de backups** — lista los últimos 14 días desde el bucket `backups/`, marca cuáles tienen los 12 CSV completos, muestra el peso. Lista también los archivos `weekly/`.
  - **Último cron** — última ejecución de `backup-csv-daily-secure`, `backup-prune-weekly`, `run-daily-draw` (consultado vía función SECURITY DEFINER que lee `cron.job_run_details`).
- Botón "Refrescar" y filtro por evento.

### 2. Alerta por email al bloquear borrado masivo

- Nueva plantilla `src/lib/email-templates/security-alert.tsx` (app email) con título, tabla afectada, número de filas, rol del actor, hora UTC, y aviso de revisar `/admin/security`.
- Registrada en `registry.ts`.
- Modificar `prevent_bulk_delete()` para que, además de insertar en `security_audit_log`, encole el aviso vía `pgmq.send('transactional_emails', ...)` directamente (la cola ya existe y la procesa el cron de email). Destinatario: lista de admins obtenida de `user_roles + profiles.email`.
- Dedupe: `idempotency_key = 'bulk-delete-' || table_name || '-' || extract(epoch from now())::int / 60` (1 aviso por minuto por tabla, evita inundar si hay ráfaga).

### 3. Soft delete + papelera 30 días

Aplicado a las 4 tablas más sensibles donde el borrado real es casi siempre un error:
`profiles`, `donations`, `subscriptions`, `winner_claims`.

- Migración:
  - Añadir columna `deleted_at TIMESTAMPTZ` (nullable) a esas 4 tablas.
  - Crear índice parcial `WHERE deleted_at IS NULL` para mantener velocidad en consultas activas.
  - Trigger `BEFORE DELETE` por fila que convierte el DELETE en `UPDATE SET deleted_at = now()` y devuelve `NULL` (cancela el borrado real). Excepción: si `app.bulk_delete_ok = 'on'` (purga legítima).
  - Actualizar policies RLS existentes para añadir `AND deleted_at IS NULL` a las SELECT (los usuarios no ven sus filas borradas).
  - Función `restore_row(table_name, row_id)` SECURITY DEFINER solo para admins.
  - Cron diario `purge-soft-deleted` a las 03:00 UTC: `DELETE` real (con `SET LOCAL "app.bulk_delete_ok" = 'on'`) de filas con `deleted_at < now() - 30 days`, en lotes de 50 para no chocar con el trigger anti-bulk.
- Panel admin gana una sección **Papelera** con las filas pendientes y botón "Restaurar".

### Riesgos a aceptar

- El soft delete obliga a que todo código existente que lee esas 4 tablas incluya `.is('deleted_at', null)` o use vistas. Vamos a auditar cada consulta y añadir el filtro donde falte (≈10-15 sitios). Las policies actualizadas dan la red de seguridad.
- El email de alerta usa `pgmq.send` directo desde un trigger SECURITY DEFINER. Si el dominio de email no está verificado todavía, el email no sale pero queda en cola — sin bloquear nada.

### Detalles técnicos

- Función `cron_status()` SECURITY DEFINER que SELECT del schema `cron` (que normalmente requiere superuser) y devuelve solo a admins vía `has_role`.
- Función `backup_inventory()` SECURITY DEFINER que llama a `supabaseAdmin.storage.from('backups').list()` no es posible desde Postgres → la lista de backups se obtiene desde un nuevo endpoint `/api/public/hooks/backup-inventory` (Bearer + secreto) o, mejor, un `createServerFn` con `requireSupabaseAuth` + check de admin que llame al storage admin del lado servidor. Optaremos por la 2ª (server fn).
- El email a admins necesita el dominio de email ya verificado. Si aún no lo está, mostraremos un aviso en el panel.

### Archivos a tocar

- Migración (nueva): trigger soft-delete + columnas + cron de purga + función `cron_status` + función `notify_admins_bulk_delete` integrada en `prevent_bulk_delete`.
- `src/lib/email-templates/security-alert.tsx` + registry.
- `src/lib/security.functions.ts`: `getSecurityAuditLog`, `getCronStatus`, `getBackupInventory`, `restoreRow`, `getSoftDeleted`.
- `src/routes/_authenticated/admin.security.tsx`: el panel.
- Auditoría y parche de las consultas a `profiles/donations/subscriptions/winner_claims` para añadir `.is('deleted_at', null)`.