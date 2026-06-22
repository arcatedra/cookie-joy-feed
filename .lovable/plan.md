## Objetivo

Cuando lleguen las 8:00 PM ET:
1. La ruleta se expande a pantalla completa centrada (modo "stage") antes de girar.
2. Gira automáticamente, muestra confeti y nombre del ganador en grande.
3. El ganador se publica automáticamente como un post fijo en la sección **Reels**.

## Cambios en frontend (`src/components/LiveDrawSection.tsx`)

- Nuevo estado `stageMode: 'idle' | 'pre-show' | 'spinning' | 'celebrating'`.
- Disparadores:
  - A los **T-10 s** del `scheduledAt` (o cuando `status` pasa a `drawing`): abrir un overlay `fixed inset-0` con backdrop oscuro + blur, ruleta escalada al ~80% del viewport (clamp para móvil), banner "EL SORTEO COMIENZA EN 00:0X".
  - A T-0 / `status === 'drawing'`: iniciar la animación de giro (la misma que hoy, pero en el stage).
  - Al `status === 'completed'`: confeti + nombre del ganador a tamaño gigante (~`clamp(3rem, 12vw, 9rem)`), premio en USD, hash de transparencia.
  - Auto-cierre del stage a los 12 s post-ganador, dejando la ruleta inline restaurada.
- Botón "Ver en pantalla completa" manual para previsualizar (admin).
- Se mantiene el panel admin de "Probar sorteo" — al ejecutarlo también abre el stage para validar la UX completa.

## Publicación automática en Reels

### Backend
- Nueva tabla `public.winner_announcements`:
  - `draw_date date unique`, `winner_display_name text`, `prize_usd numeric`, `seed_hash text`, `published_at timestamptz`.
  - RLS: `SELECT` público (`anon`+`authenticated`), `INSERT/UPDATE/DELETE` solo `service_role`.
- Modificar `public.run_daily_draw()` para que tras marcar `completed` inserte una fila en `winner_announcements` (idempotente via `ON CONFLICT (draw_date) DO NOTHING`).
- Nueva RPC `get_winner_announcements(p_limit int)` para el feed.

### Frontend Reels (`src/routes/reel.$reelId.tsx` y/o `src/routes/explore.tsx`)
- Tarjeta "🏆 Ganador del día" **pinneada al inicio** del feed de reels, alimentada por `get_winner_announcements`.
- Diseño consistente con el branding actual (beige/azul/dorado): avatar genérico, nombre del ganador grande, premio, fecha, link a `/ruleta`.
- Lista histórica (últimos 7) debajo o accesible al hacer scroll.

## Notas técnicas

- El stage se monta con `createPortal` a `document.body` para escapar de cualquier `overflow`.
- Bloqueo de scroll del body mientras el stage está activo.
- Respeta `prefers-reduced-motion`: si el usuario lo pide, no escala ni rota dramáticamente — solo fade del nombre.
- La detección de "hora del sorteo" sigue siendo server-driven (`status === 'drawing'` del polling); el cliente solo usa el countdown local como pre-aviso visual.

## Archivos a tocar

- `src/components/LiveDrawSection.tsx` (stage mode + portal)
- `supabase/migrations/<new>_winner_announcements.sql` (tabla + RLS + grants + actualización de `run_daily_draw`)
- `src/lib/daily-draw.functions.ts` (nuevo `getWinnerAnnouncements`)
- `src/routes/reel.$reelId.tsx` o feed contenedor (tarjeta pinneada de ganador)

¿Confirmas que el "post en reels" debe ser una **tarjeta destacada de texto/branding** en el feed (no un video generado)?
