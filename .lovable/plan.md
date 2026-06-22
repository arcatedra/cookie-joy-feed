
# Sorteo Diario Automático "Live Draw" 8:00 PM

Convertir la ruleta personal (cada usuario gira sus propias estrellas) en un **sorteo comunitario diario** automatizado: cada usuario que compre estrellas durante el día queda inscrito; a las 20:00 (hora local del servidor) la ruleta se cierra, gira sola en pantalla y revela al ganador del bote acumulado.

> Nota importante: el modelo actual de la página `/ruleta` permite a cada usuario gastar 10 ⭐ y girar individualmente. Este cambio reorienta la página al **sorteo diario** — la mecánica individual de "gira tú mismo" desaparecería de la pantalla principal (las misiones sociales y compra de estrellas se mantienen, pero ahora las estrellas = **boletos del sorteo del día**).

---

## 1. Base de datos (migración)

Nueva tabla `daily_draws`:
- `draw_date` (date, único) — el día del sorteo
- `status` — `open` | `drawing` | `completed`
- `winner_subject_id`, `winner_email`, `winner_display_name`
- `prize_usd` — snapshot del bote acumulado en el momento del cierre
- `tickets_total`, `entrants_total`
- `scheduled_at`, `drawn_at`
- `seed_hash` (transparencia — hash determinístico)

Nueva tabla `daily_draw_entries`:
- `draw_date`, `subject_user_id`/`subject_email`, `display_name`, `tickets` (1 ticket por ⭐ comprada ese día)
- Único por (draw_date, subject)

RPC `get_today_draw_status()` (SECURITY DEFINER, público):
- Devuelve `{ draw_date, status, prize_usd_live, entrants_count, winner?, scheduled_at }`
- `prize_usd_live` = suma de `pool_share_usd` del día de hoy (ya existe `prize_pool_ledger`)

RPC `get_recent_winners(limit int)`:
- Últimos N ganadores con `draw_date`, `display_name` (truncado a iniciales+nombre), `prize_usd`

GRANTs: `SELECT` a `anon` en RPC; tablas sólo `service_role`.

## 2. Lógica de inscripción

En el webhook de Stripe (`/api/public/payments/webhook.ts`), cuando se confirme una compra de estrellas:
- Además del split 50/50 ya implementado → insertar/actualizar fila en `daily_draw_entries` para `draw_date = today (America/New_York o zona configurada)`, sumando `tickets += stars`.

## 3. Trigger automático 20:00 (pg_cron)

Crear ruta `/api/public/hooks/run-daily-draw` (POST, autenticada con `apikey` anon):
1. Idempotente: si ya hay `daily_draws` con `status='completed'` para hoy → return.
2. Cargar entries del día. Si 0 → marcar `status='completed'` sin ganador, devolver.
3. Snapshot del bote → `prize_usd`.
4. Generar `seed = sha256(draw_date || prize_pool_ledger_count || random_bytes)`; convertir a número, mod por suma total de tickets → seleccionar ganador ponderado por tickets.
5. Insertar `daily_draws` con status `completed`, ganador, hash.
6. Limpiar/reiniciar `prize_pool_ledger` no — el bote se acumula histórico; usamos `prize_usd` snapshot.

Programar con `pg_cron` diario 20:00:
```sql
SELECT cron.schedule('daily-roulette-draw', '0 0 * * *',  -- 20:00 ET = 00:00 UTC
  $$ SELECT net.http_post(
    url:='https://project--<id>.lovable.app/api/public/hooks/run-daily-draw',
    headers:='{"apikey":"<anon>","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);
```
(Ajustar a la zona horaria que confirme el usuario.)

## 4. UI — Pantalla `/ruleta` rediseñada

### Panel superior fijo (Bote)
- Banner sticky en el top con `PrizePoolCounter` (ya existe) reutilizado para mostrar **bote del día**.
- Animación: pulso dorado cada vez que cambie el monto (polling 10s); badge "EN VIVO".
- Cuenta regresiva grande: `HH:MM:SS` hasta las 20:00.
- Contador de participantes inscritos hoy.

### Estado `open` (antes de 20:00)
- La ruleta se muestra estática con leyenda "El sorteo gira automáticamente a las 8:00 PM".
- Botón principal cambia de "GIRAR" a "COMPRAR ESTRELLAS PARA PARTICIPAR".
- Lista de participantes (avatares/iniciales) corriendo en marquee.

### Estado `drawing` (20:00 – 20:00:08)
- Polling cada 1s; al detectar `status='drawing'` o `completed` reciente:
- Animación de giro 6s con desaceleración cubic-bezier, con punteros recorriendo nombres de participantes en el aro exterior.
- Audio opcional (tick-tick acelerado → lento).

### Estado `completed`
- Confeti (`canvas-confetti`), flash dorado, modal gigante:
  - "🎉 ¡GANADOR DEL DÍA!"
  - Nombre del ganador (text-6xl)
  - Premio en USD (text-7xl gold)
  - Hash de transparencia (pequeño, copiable)
- Auto-cerrable a los 30s, queda en estado "Próximo sorteo: mañana 8:00 PM".

### Leaderboard histórico
- Sección debajo de la ruleta: tabla con últimos 14 ganadores
- Columnas: Fecha · Ganador · Premio · Hash
- Card design glassmorphism, fila destacada para "HOY".

## 5. Archivos a crear / modificar

**Nuevos:**
- `supabase/migrations/<ts>_daily_draws.sql` (tablas + RPCs + GRANTs)
- `src/lib/daily-draw.functions.ts` — `getTodayDraw()`, `getRecentWinners()`, `getMyEntry()`
- `src/routes/api/public/hooks/run-daily-draw.ts` — el ejecutor
- `src/components/DailyDrawBanner.tsx` — banner sticky + countdown
- `src/components/LiveRoulette.tsx` — ruleta con animación de live draw
- `src/components/WinnerCelebration.tsx` — confeti + modal
- `src/components/WinnersLeaderboard.tsx`

**Modificados:**
- `src/routes/ruleta.tsx` — reorganizado: Banner → Ruleta Live → Misiones+Compra → Leaderboard
- `src/routes/api/public/payments/webhook.ts` — agregar inscripción en `daily_draw_entries`
- `package.json` — añadir `canvas-confetti`

## 6. Detalles técnicos

- Zona horaria por defecto: **America/New_York** (confirmar con usuario). El día del sorteo se calcula con `date_trunc('day', now() AT TIME ZONE 'America/New_York')`.
- Transparencia: el `seed_hash` se publica antes del sorteo (commit-reveal opcional en v2).
- Privacidad: mostrar solo `Nombre A.` (inicial del apellido) en el leaderboard.
- Idempotencia del cron: PK única en `daily_draws(draw_date)` previene doble sorteo.
- Disclaimer legal mantenido en footer (AMOE sigue activo).

## 7. Preguntas pendientes

1. **Zona horaria del "8:00 PM"**: ¿America/New_York, America/Mexico_City, otra?
2. **¿Qué pasa si nadie compró estrellas un día?** Plan: marcar sin ganador y el bote rueda al siguiente día (cambiar lógica de `prize_usd` snapshot).
3. **¿Las estrellas se "consumen" al participar o son acumulativas para múltiples días?** Plan actual: cada compra del día = N tickets sólo para ese día (se "consumen" al cerrar el sorteo).

Confirmar estas 3 decisiones antes de implementar.
