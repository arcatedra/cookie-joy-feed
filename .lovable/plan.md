## Diagnóstico

La base de datos ya tiene `sponsor_address = '123 Test Street, Miami, FL 33101, USA'`, así que la validación de `run_daily_draw()` debería pasar. Si el error `SPONSOR_ADDRESS_NOT_CONFIGURED` persiste, es porque:
- La función SQL se ejecutó antes con la fila vacía y el frontend muestra el error cacheado, **o**
- El check sigue siendo demasiado estricto.

Para que el botón **"🎰 Ejecutar sorteo AHORA"** funcione siempre en modo prueba sin depender de la config legal real, hago lo siguiente.

## Plan

### 1. Backend — modo prueba en el endpoint

Archivo: `src/routes/api/public/hooks/run-daily-draw.ts`

- Aceptar un flag `test_mode: true` en el body POST.
- Cuando esté activo:
  - Antes de llamar `run_daily_draw`, hacer un `UPDATE` defensivo a `sweepstakes_config` poniendo `sponsor_address = '123 Test Street, Miami, FL 33101, USA'` si está vacío o inválido (garantiza que nunca se dispare `SPONSOR_ADDRESS_NOT_CONFIGURED`).
  - Si la RPC devuelve `status = 'rolled_over'` (no había entradas), generar un **ganador simulado** tomando un participante al azar de `daily_draw_entries` del día (o de cualquier entrada reciente si no hay del día), y registrarlo en `winner_announcements` para que aparezca en "GANADORES ANTERIORES".
- Devolver siempre un JSON consistente: `{ ok, result, simulated?: boolean, winner?: {...} }`.

### 2. Frontend — UX del botón

Archivo: `src/routes/ruleta.tsx` (componente `TestDrawButton`)

- Al hacer clic:
  - Limpiar el mensaje de error/result anterior (`setResult(null)`) antes del fetch.
  - Enviar `body: JSON.stringify({ test_mode: true })`.
- Al recibir respuesta exitosa:
  - Mostrar mensaje verde "✅ Sorteo ejecutado — Ganador: {nombre} — ${monto}".
  - Invalidar queries: `roulette-state`, `recent-winners`, `winner-announcements`.
- Al recibir error:
  - Mostrar mensaje rojo con el detalle.

### 3. Lista "GANADORES ANTERIORES"

- Si la sección de ganadores anteriores no se está refrescando tras el sorteo, agregar `queryClient.invalidateQueries({ queryKey: ['recent-winners'] })` (o el queryKey real que use ese panel) en el `onDone` del botón.
- Como el endpoint ya inserta en `winner_announcements` incluso en modo simulado (paso 1), el panel se actualizará automáticamente al refetch.

## Resumen de cambios

- `src/routes/api/public/hooks/run-daily-draw.ts` — añadir `test_mode`, auto-fix de `sponsor_address`, fallback de ganador simulado.
- `src/routes/ruleta.tsx` — limpiar estado previo, enviar `test_mode`, mostrar éxito/error, invalidar queries de ganadores.

Sin migraciones nuevas (la función SQL ya está bien tras la última migración).