## Objetivo

Cuando el usuario gaste 10⭐ y dispare el giro en `/ruleta`, en vez de girar discretamente in-place, abrir un **overlay fullscreen** con la ruleta centrada que gira durante **15 segundos** con build-up dramático y luego revela el premio.

## Cambios (solo UI, sin tocar backend)

Archivo: `src/routes/ruleta.tsx`

1. **Nuevo componente `SpinStageOverlay`**
   - `position: fixed; inset: 0; z-index: 100` con fondo `rgba(15,30,55,0.92)` + blur.
   - Centra el componente `Wheel` existente (reutilizado tal cual) y el puntero/gema.
   - Fases internas controladas por estado:
     - `building` (0–1 s): wheel entra con `scale-in`, eyebrow "Preparando el giro…".
     - `spinning` (1–15 s): wheel rota con la transición CSS extendida a 14 s, easing `cubic-bezier(0.15, 0.7, 0.1, 1)` para empezar rápido y desacelerar fuerte al final. Texto rotativo cada 3 s: "El destino se mueve…", "Casi…", "Suerte…", contador regresivo discreto (15…1).
     - `revealing` (≥15 s): wheel se detiene en el sector ganador, confetti dorado (CSS keyframes), `PrizeCard` aparece debajo con `scale-in`.
   - Botón "Cerrar" sólo visible en `revealing`.

2. **Ajustar `handleSpin`**
   - Activar overlay (`setStageOpen(true)`) antes del request.
   - Llamar `spinFn()`, calcular `delta` igual que hoy pero con `turns = 18` (más vueltas para llenar 14 s visibles).
   - Cambiar el `transition` del SVG cuando `spinning` esté activo: `transform 14s cubic-bezier(0.15, 0.7, 0.1, 1)`.
   - Reemplazar `setTimeout(..., 4800)` por `setTimeout(..., 15000)` antes de pasar a fase `revealing` y mostrar `PrizeCard`.
   - En error de servidor: cerrar el overlay y mostrar `toast.error`.

3. **Re-montar `Wheel` + `SpinButton` en el JSX principal**
   - Hoy (línea 184) la mini-ruleta está removida. Añadir una sección "Tu giro de la suerte" sobre `BuyTokensPanel` que renderice `SpinButton`. El `Wheel` ya no se muestra inline: vive sólo dentro del overlay durante el giro.

4. **Accesibilidad / UX**
   - `aria-modal="true"`, `role="dialog"`, `aria-live="polite"` para los textos de fase.
   - Cerrar con `Escape` sólo cuando fase = `revealing`.
   - Bloquear scroll del body mientras el overlay esté abierto.

## Detalles técnicos

- Duración de giro: 14 s de animación CSS + 1 s de build-up = **15 s totales** antes de revelar.
- Easing: `cubic-bezier(0.15, 0.7, 0.1, 1)` para arranque enérgico y frenado lento (más suspenso al final).
- Vueltas: `turns = 18` para que la rueda esté visiblemente girando durante toda la animación sin verse "lenta".
- Confetti: 30 partículas absolutas con keyframes `fall` + `spin`, sin dependencias nuevas.
- Sin cambios en `roulette.functions.ts`, `roulette-config.ts`, ni en el endpoint `spin`.

## Fuera de alcance

- No se toca `LiveDrawSection` (sorteo USD).
- No se cambia el costo (10⭐), los premios, ni la lógica de cupones.
