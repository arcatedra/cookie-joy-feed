# Plan: Logo sin fondo para integrarse al encabezado

## Problema
El asset actual `hazorex-symbol-gold.png` incluye un fondo azul texturizado detrás del símbolo dorado. Al colocarlo sobre el encabezado azul marino o el fondo azul grisáceo, se nota un "cuadro" de fondo alrededor del logo, lo que rompe la integración visual.

## Objetivo
Quitar el fondo del símbolo dorado manteniendo el color, la forma 3D y el estilo actuales, para que el logo se vea "flotando" sobre el encabezado y se adapte perfectamente a su color.

## Pasos

1. **Limpiar el logo**
   - Usar `imagegen--edit_image` sobre la imagen actual (`/tmp/logo-inspect.png` o el CDN original).
   - Prompt: eliminar el fondo azul texturizado, mantener el símbolo dorado 3D intacto, resultado en PNG transparente.
   - Guardar como `src/assets/hazorex-symbol-gold.png` temporal.

2. **Subir a Lovable Assets**
   - `lovable-assets create --file src/assets/hazorex-symbol-gold.png > src/assets/hazorex-symbol-gold.png.asset.json`
   - Eliminar el binario temporal después de subir (quedará solo el `.asset.json` en el repo).

3. **Actualizar la referencia en el componente**
   - Verificar que `src/components/TopNav.tsx` siga importando `hazorexSymbolAsset` y usando `hazorexSymbolAsset.url`.
   - No cambiar tamaño ni posición salvo que sea necesario para que el símbolo transparente luzca equilibrado.

4. **Verificar visualmente**
   - Ejecutar `bun run build`.
   - Capturar screenshot del header en `http://localhost:8080/` para confirmar que el símbolo dorado no tiene fondo visible y se integra con el azul marino del encabezado.

## Resultado esperado
El símbolo dorado aparece al lado de "HAZOREX" sin ningún fondo o cuadro alrededor, luciendo como parte nativa del encabezado.