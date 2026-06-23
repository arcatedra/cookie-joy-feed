# Verificación del backup CSV

## Pasos

1. Llamar al endpoint `POST /api/public/hooks/backup-csv` con el header `apikey` correcto (publishable key).
2. Leer la respuesta JSON: `{ ok, stamp, results: [{ table, rows, path?, error? }] }` — confirmar que cada tabla tiene `path` y ningún `error`.
3. Listar los objetos del bucket `backups` bajo el prefijo `YYYY-MM-DD/` con `supabase--read_query` sobre `storage.objects` para confirmar que los 11 archivos están escritos.
4. Reportar resumen: tablas exportadas, filas por tabla, paths generados, errores si los hay.

## Tablas que se verifican

`winner_claims`, `daily_draws`, `daily_draw_entries`, `winner_announcements`, `amoe_entries`, `profiles`, `donations`, `subscriptions`, `user_tokens`, `prize_pool_ledger`, `sweepstakes_config`.

## Nota

Es una acción de escritura (sube archivos al bucket `backups`), por eso requiere aprobación antes de ejecutarse.
