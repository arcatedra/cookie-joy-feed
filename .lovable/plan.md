## Objetivo

Reemplazar únicamente el símbolo (la "X" actual) por la imagen dorada que acabas de subir. El texto "HAZOREX" se mantiene exactamente como está.

## Cambios

1. **Subir el nuevo símbolo como asset CDN**
   - Tomar `user-uploads://Captura_de_pantalla_2026-06-21_152708.png`
   - Quitarle el fondo azul para que quede transparente (solo el símbolo dorado)
   - Subirlo vía `lovable-assets` como `src/assets/hazorex-symbol-new.png.asset.json`

2. **Actualizar `src/components/HazorexLogo.tsx`**
   - Cambiar la imagen usada en `HazorexSymbol` (y en la parte del símbolo de `HazorexLogo`) para que apunte al nuevo asset
   - No tocar el texto "HAZOREX" ni su tipografía/tamaño/espaciado
   - Mantener las tres variantes existentes (`HazorexLogo`, `HazorexSymbol`, `HazorexSymbolOnly`) con la misma API

3. **Limpieza**
   - Eliminar los assets viejos que ya no se usen (`hazorex-symbol-only.png.asset.json`, `hazorex-h-symbol.png.asset.json`) tras confirmar que no se referencian en ningún otro sitio

## Lo que NO cambia

- Texto "HAZOREX" en el TopNav y en el carrito
- Estructura del componente, props, tamaños ni posiciones
- Rutas, traducciones, ni ninguna otra parte de la app
