Plan: Logo limpio en la pantalla de login

Objetivo
--------
Eliminar el fondo blanco cuadrado que aparece alrededor del símbolo dorado en la página de inicio de sesión, dejando una versión transparente y más limpia del mismo símbolo. Solo afecta a la pantalla de login.

Cambios propuestos
------------------
1. Revisar el asset existente `src/assets/hazorex-symbol-gold-transparent.png.asset.json`, que ya es una versión transparente del símbolo dorado HAZOREX.
2. Actualizar `src/routes/auth.tsx` para que, en el encabezado del login, use el asset transparente en lugar de `hazorex-symbol-new.png`.
3. Ajustar `src/components/HazorexLogo.tsx` si es necesario para exponer una variante `HazorexSymbol` que use el asset transparente, o importar directamente el asset transparente en la ruta de auth.
4. Verificar visualmente que en /auth el símbolo ya no tenga caja blanca y se vea profesional sobre el fondo de la página.

Archivos a modificar
--------------------
- `src/routes/auth.tsx`
- Posiblemente `src/components/HazorexLogo.tsx` (si conviene centralizar la variante transparente)

No se tocan otros usos del logo (header, carrito, checkout) porque el usuario pidió solo el login. No se genera un logo nuevo porque se quiere conservar el mismo símbolo.