## Aviso visual antes del sorteo (parpadeo de la ruleta)

Sí — todo el sistema del sorteo ya quedó funcionando. Ahora agrego la señal visual previa.

### Qué se va a ver
- **T-5 minutos**: la ruleta empieza un parpadeo suave (glow dorado pulsante lento ~1.5s) + badge sutil "Sorteo en 5 min".
- **T-1 minuto**: parpadeo intenso (pulso rápido ~0.6s) con halo dorado más fuerte + badge en rojo "¡A punto de girar!".
- A T-15s ya existe el modo "stage" fullscreen — no se toca.
- Al volver a >5 min (caso edge), el efecto desaparece.

### Cambios técnicos
1. **`src/components/LiveDrawSection.tsx`**
   - Derivar dos flags nuevos junto al `lastMinute` existente:
     - `preWarn5 = isOpen && cd.ms > 60_000 && cd.ms <= 5*60_000`
     - `preWarn1 = isOpen && cd.ms > 15_000 && cd.ms <= 60_000`
   - Aplicar clases condicionales al contenedor del wheel: `pre-draw-pulse-soft` o `pre-draw-pulse-strong`.
   - Mostrar un badge pequeño encima de la ruleta con el texto correspondiente (i18n).
2. **`src/styles.css`**
   - Añadir 2 keyframes (`pre-draw-glow-soft`, `pre-draw-glow-strong`) usando tokens existentes (oro). Respeta `prefers-reduced-motion` (sin animación, sólo cambio de color estático).
3. **i18n** — añadir claves en los 9 locales:
   - `liveDraw.preWarn5` → "Sorteo en 5 minutos"
   - `liveDraw.preWarn1` → "¡A punto de girar!"

### Notas
- Sólo cambios de presentación. No toca lógica del sorteo ni del cron (ya arreglados).
- Sin nuevas dependencias.
