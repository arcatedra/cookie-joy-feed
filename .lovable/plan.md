# Ruleta: apertura 5 min antes + giro más largo

## Qué cambia (solo UI)

### 1. Auto-apertura 5 min antes con efecto titilante
- En el componente que decide cuándo abrir `FullscreenDrawExperience` (probablemente `LiveDrawSection` o `PreDrawCountdownBanner`), detectar cuándo faltan ≤ 5 min para el sorteo y forzar `open=true` automáticamente.
- Añadir una nueva fase `"pre"` en `FullscreenDrawExperience` que se muestra durante esos 5 min antes del countdown 3-2-1:
  - Tarjeta central grande con el mensaje "El sorteo comienza en mm:ss"
  - Animación titilante (pulse de opacidad + glow dorado) usando `@keyframes` ya en el archivo o una nueva `origen-blink`
  - Cuando el contador llega a 0, transición automática a la fase `countdown` actual (3-2-1 → spin)
- Mantener el botón de cerrar disponible en la fase `pre` (el usuario puede minimizar si quiere).

### 2. Giro más largo (12 segundos)
- Hoy el spin dura 4.6s (`transition: transform 4.6s ...` + `setTimeout 4800ms`).
- Subirlo a **12s** (within el rango pedido 10-15s):
  - `transition: transform 12s cubic-bezier(0.17, 0.67, 0.16, 0.99)`
  - `setTimeout` de resolución de ganador → `12000ms`
  - Aumentar las vueltas totales (de `360*8` a `360*15`) para que la velocidad se sienta natural durante 12s en vez de lenta.
- La llamada al API ya se dispara en paralelo desde el inicio, así que alargar el spin no añade latencia real.

## Archivos a tocar
- `src/components/FullscreenDrawExperience.tsx` — nueva fase `pre`, animación titilante, spin a 12s.
- El componente que monta `<FullscreenDrawExperience open={...} />` (a confirmar al explorar: `LiveDrawSection.tsx` o `PreDrawCountdownBanner.tsx`) — lógica de auto-abrir cuando faltan ≤ 5 min.

## Lo que NO cambia
- Backend, API del sorteo, lógica de ganador, emails, base de datos: nada se toca.
- El challenge post-ganador y el resto del flujo siguen igual.

## Pregunta antes de implementar
¿Quieres que durante esos 5 min previos la ruleta ya se vea en pantalla (estática, esperando) con el contador titilante encima, o prefieres solo la tarjeta titilante centrada y la ruleta aparece recién cuando arranca el 3-2-1?
