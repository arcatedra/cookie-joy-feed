## Objetivo
Hacer una prueba en vivo: que el sorteo se dispare automáticamente **dentro de 5 minutos** desde ahora, para ver cómo se activa el endpoint, se elige ganador y se muestra en `/ruleta`. Después revertimos a las 8:00pm ET.

## Pasos

### 1. Quitar temporalmente el bloqueo "antes de las 8pm ET" en el endpoint
Archivo: `src/routes/api/public/hooks/run-daily-draw.ts`

Comentar el bloque que devuelve `skipped: before-8pm-et` (líneas 128–130). Así, cuando el cron de cada 5 min llame al endpoint, ejecutará el RPC `run_daily_draw` sin esperar a las 20:00 ET.

> Nota: lo dejaré marcado con un comentario `// TEMP: prueba — revertir después` para volver a habilitarlo fácilmente.

### 2. Ajustar `scheduled_at` del sorteo de hoy a "ahora + 5 minutos"
- Forzar la creación del draw de hoy llamando a `ensure_today_draw()`.
- Actualizar `daily_draws.scheduled_at` para el día de hoy ET a `now() + interval '5 minutes'`.
- Esto hace que el countdown visible en `/ruleta` muestre ~5:00 y el frontend dispare el endpoint cuando llegue a 0.

### 3. Sembrar 1 entrada de prueba para que haya ganador
Sin tickets, el sorteo se marcaría `rolled_over` sin animación útil. Inserto **1 ticket de prueba** en `daily_draw_entries` con `display_name = "Prueba"` y `source = 'paid'` para que la ruleta gire y muestre un ganador real.

### 4. Esperar y verificar
- Quedarte en `/ruleta`; el cron cada 5 min disparará el endpoint en cuanto pase el `scheduled_at`.
- Verifico en `daily_draws`, `winner_announcements` y `winner_claims` que se haya completado.

### 5. Reversión (después de la prueba)
Cuando confirmes que funcionó, en el siguiente turno:
- Descomentar el bloqueo `< 20` en el endpoint.
- Borrar la entrada de prueba.
- Resetear el draw de hoy (o dejarlo como completado si te gusta el resultado).

## Detalles técnicos

- Cron `run-daily-draw-every-5min` ya está activo (`*/5 * * * *`) → no necesita cambios, garantiza la ejecución sin esperar a las 8pm.
- El cambio en el endpoint es de **1 línea efectiva** y reversible.
- `LiveDrawSection.tsx` también dispara el endpoint client-side al llegar el countdown a 0, así que verás el spin inmediatamente si estás en la página.
- No se enviarán emails reales si la entrada de prueba no tiene email; si quieres recibir el email de ganador, dime tu email y lo uso como `subject_email`.

## Pregunta rápida antes de implementar
¿Quieres que la entrada de prueba use **tu email** (para recibir la notificación de ganador) o la dejo anónima sin email?
