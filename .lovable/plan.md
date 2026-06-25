## Qué está pasando (en simple)

El sorteo del 24 de junio **no se ejecutó**, aunque sí había 2 participantes reales (`naveajhol` y `theworldofserviceservice`). Por eso no aparece nombre de ganador.

La causa: el "robot" automático (cron) que dispara el sorteo cada noche a las 8 PM ET está enviando una llave equivocada al endpoint. El endpoint la rechaza con error 401 (no autorizado) y nunca llega a sortear.

**Evidencia técnica:**
- `daily_draws` para 2026-06-24: `status='closed'`, `tickets_total=0`, sin ganador.
- `daily_draw_entries` para 2026-06-24: 2 entradas reales existen.
- El cron `sweepstakes-run-daily-draw` envía header `apikey: sb_publishable_...` (la llave pública del front).
- El endpoint `/api/public/hooks/run-daily-draw` exige `apikey === DRAW_CRON_SECRET`. No coincide → 401 → `run_daily_draw` jamás se llama.

## Plan de arreglo

1. **Crear migración** que recree los 2 cron jobs afectados usando el secreto correcto `DRAW_CRON_SECRET` embebido literalmente en el comando del cron (igual estilo que el resto de hooks):
   - `sweepstakes-run-daily-draw` (00:00 y 01:00 UTC = 8 PM y 9 PM ET)
   - `daily-roulette-draw` (mismo horario, también podría tener el mismo bug — confirmar y arreglar si aplica)
2. **Ejecutar manualmente** el sorteo atrasado del 24 de junio una sola vez (llamando `run_daily_draw()`) para que se elija ganador entre los 2 participantes existentes y se cree el `winner_claim` + email de notificación.
3. **Verificar** consultando `daily_draws` que aparezca `winner_display_name` y `status='completed'`, y revisar logs del endpoint en la próxima corrida automática.

## Nota

No hace falta tocar el endpoint ni el código de la app. Sólo se corrige la configuración del cron en la base de datos.
