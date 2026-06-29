## Objetivo

Colocar el logo dorado (X entrelazada) que subiste a la izquierda del nombre **HAZOREX** en el header, sin tocar el texto ni su estilo.

## Cambios

1. **Subir el nuevo logo como asset CDN**
   - Tomar el archivo subido (`user-uploads://cbcfe146-...png`).
   - Crear `src/assets/hazorex-symbol-gold.png.asset.json` con `lovable-assets create`.

2. **Actualizar `src/components/TopNav.tsx`**
   - Cambiar el import `hazorexSymbolUrl` para apuntar al nuevo asset JSON (usando `.url`).
   - Mantener exactamente el mismo tamaño (`h-10` móvil / `h-[52px]` desktop), la misma posición (símbolo primero, luego nombre) y el mismo estilo dorado del texto **HAZOREX**.

3. **No tocar nada más**: ni el texto, ni la página principal, ni el login de Google, ni otros logos del sitio.

## Resultado

El header mostrará: `[logo dorado nuevo]  HAZOREX` — idéntico al layout actual, solo cambia la imagen del símbolo.
