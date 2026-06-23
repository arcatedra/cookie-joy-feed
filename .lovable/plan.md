# Asegurar el endpoint de backup CSV

## El problema

Tienes razón: el endpoint `/api/public/hooks/backup-csv` **no tiene candado real**.

Hoy compara el header `apikey` contra `SUPABASE_PUBLISHABLE_KEY`, que es **la clave pública** del frontend — está expuesta en el bundle del navegador y en todas las llamadas del cliente. Cualquiera que abra DevTools puede leerla y disparar el endpoint para:

- Forzar volcados completos de todas las tablas críticas (profiles, donations, subscriptions, winner_claims…) al bucket `backups`.
- Sobrescribir backups legítimos (usa `upsert: true`).
- Consumir storage y créditos.

El bucket en sí es privado, pero el endpoint no debería poder dispararse desde fuera del cron.

Comparación con los otros hooks:

| Endpoint | Candado actual |
|---|---|
| `notify-winner` | Bearer + `WINNER_NOTIFY_SECRET` (secreto dedicado) ✅ |
| `run-daily-draw` | Bearer + secreto dedicado ✅ |
| `backup-csv` | `apikey` = anon key pública ❌ |

## La solución

Replicar el patrón de `notify-winner`: un secreto dedicado, solo conocido por el cron y por el endpoint.

### Pasos

1. **Generar `BACKUP_HOOK_SECRET`** (64 chars random) y guardarlo como secreto del proyecto.

2. **Endurecer `src/routes/api/public/hooks/backup-csv.ts`**:
   - Aceptar solo `Authorization: Bearer <BACKUP_HOOK_SECRET>`.
   - Rechazar el header `apikey` (eliminar el fallback inseguro).
   - Comparación en tiempo constante para evitar timing attacks.
   - Devolver 401 con cuerpo vacío en cualquier fallo de auth.

3. **Actualizar el cron job** (`cron.schedule` ya existente, job de las 7:30 UTC):
   - `cron.unschedule` del job actual.
   - Volver a programarlo con header `Authorization: Bearer <secreto>` en lugar de `apikey`.
   - El secreto se lee desde Vault / settings de Postgres para no quedar en texto plano en `cron.job`.

4. **Verificar**: disparar el endpoint manualmente sin el header → 401. Con el header → 200 y nuevos archivos en `backups/YYYY-MM-DD/`.

## Detalles técnicos

- El secreto se mete en Postgres con `ALTER DATABASE ... SET app.backup_hook_secret = '…'` no es viable en Cloud (prohibido por las reglas de migración). Alternativa: guardarlo en la tabla `internal_hook_config` (mismo patrón que `notify_winner_secret`) y leerlo dentro del `cron.schedule` con un `SELECT value FROM internal_hook_config WHERE key = 'backup_hook_secret'` concatenado al `headers` jsonb.
- El endpoint sigue bajo `/api/public/*` (bypass de auth del edge) pero la verificación Bearer manual queda como única puerta.
- Sin cambios en el bucket ni en la lógica de exportación; solo cambia la autenticación del endpoint y el cron que lo invoca.

## Archivos a tocar

- `src/routes/api/public/hooks/backup-csv.ts` — sustituir validación de `apikey` por Bearer con secreto dedicado.
- Insert SQL (no migración) para: añadir `backup_hook_secret` a `internal_hook_config`, `cron.unschedule` del job viejo y `cron.schedule` del nuevo.
- Nuevo secreto del proyecto: `BACKUP_HOOK_SECRET` (autogenerado).
