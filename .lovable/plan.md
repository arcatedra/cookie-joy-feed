## Diagnóstico (estado actual en producción)

Hay 3 cron jobs apuntando al mismo endpoint `run-daily-draw`:

| jobid | nombre | schedule (UTC) | observación |
|---|---|---|---|
| 1 | `daily-roulette-draw` | `0 0,1 * * *` | OK — cubre 20:00 ET en EDT (00:00 UTC) y en EST (01:00 UTC) |
| 3 | `run-daily-draw-every-5min` | `*/5 * * * *` | **Residuo del modo prueba** — está disparando el sorteo cada 5 minutos |
| 5 | `run-daily-draw-et-2000` | `0 0,1 * * *` | Duplicado de #1 |

`run_daily_draw()` es idempotente por `draw_date` (sale temprano si `status IN ('completed','rolled_over')`), así que los disparos extra no abren un nuevo sorteo el mismo día ET, pero igualmente generan ruido en logs y son un riesgo si alguien cambia esa lógica. El job #3 además ejecuta `ensure_today_draw()` cada 5 min, lo cual no es lo deseado en vivo.

Sobre la zona horaria: ET = UTC-5 en invierno (EST) y UTC-4 en verano (EDT). pg_cron corre en UTC y no entiende DST. El patrón `0 0,1 * * *` (dispara a 00:00 UTC y 01:00 UTC) garantiza que **el disparo correspondiente a las 20:00 ET ocurre siempre**, en ambas estaciones; el otro disparo cae a las 21:00 ET o 19:00 ET y queda como no-op por idempotencia. Es el patrón estándar y seguro.

## Cambios propuestos

Una sola migración:

1. `SELECT cron.unschedule('run-daily-draw-every-5min');` — elimina el residuo del modo prueba.
2. `SELECT cron.unschedule('run-daily-draw-et-2000');` — elimina el duplicado.
3. Dejar `daily-roulette-draw` (jobid 1) como única fuente del sorteo diario. Schedule actual `0 0,1 * * *` ya es correcto para 20:00 ET con DST.

## Verificación posterior

Después de aplicar la migración voy a correr:

- `SELECT jobid, jobname, schedule, active FROM cron.job;` — confirmar que solo queda `daily-roulette-draw`.
- `SELECT jobid, status, start_time, end_time FROM cron.job_run_details WHERE jobid = 1 ORDER BY start_time DESC LIMIT 10;` — confirmar últimas ejecuciones exitosas a 00:00 / 01:00 UTC.
- Confirmar al usuario que el contador visible en `/ruleta` (que ya apunta a 20:00 America/New_York con ajuste DST en el cliente) coincide con el disparo real del backend.

## Lo que NO se toca

- `process-email-queue` (cron de emails, no relacionado).
- `src/components/FullscreenDrawExperience.tsx` y `src/routes/ruleta.tsx` — ya están en modo vivo con countdown a 20:00 ET.
- `run_daily_draw()` — la lógica SQL ya es correcta e idempotente por día ET.
