Plan: Aviso de zona de entrega en la tienda

Objetivo
--------
Colocar un aviso llamativo y siempre visible en la sección "Nuestras Galletas" de la tienda, informando que por ahora las entregas solo se realizan en Manhattan, Brooklyn, Queens y Bronx.

Cambios propuestos
------------------
1. Nuevo componente: `src/components/DeliveryAreaNotice.tsx`
   - Banner compacto con icono de camión / ubicación.
   - Texto: "Por ahora solo entregamos en Manhattan, Brooklyn, Queens y Bronx. Muy pronto en más ciudades."
   - Estilo acorde al sitio: fondo ámbar/dorado, texto oscuro, bordes redondeados.
   - No depende del estado del usuario; se muestra siempre.

2. Integrar el aviso en `src/routes/shop.tsx`
   - Colocarlo debajo del título "Nuestras Galletas" y subtítulo, justo antes de la grilla de productos.
   - Asegurar que se vea bien en móvil y escritorio.

3. Añadir claves de traducción en `src/locales/*/translation.json`
   - `shop.deliveryAreaNotice`: "Por ahora solo entregamos en Manhattan, Brooklyn, Queens y Bronx. Muy pronto en más ciudades."
   - Actualizar al menos: español, inglés y alemán. Para otros idiomas se puede dejar la misma clave en inglés si no hay traducción disponible aún.

4. Ajuste menor opcional
   - Revisar que el subtítulo actual de la tienda ("Recién horneadas, enviadas a todo el país.") no contradiga el aviso. Si se prefiere, actualizar a algo como "Recién horneadas, entregadas en tu puerta en NYC".

Archivos a modificar
--------------------
- `src/components/DeliveryAreaNotice.tsx` (nuevo)
- `src/routes/shop.tsx`
- `src/locales/es/translation.json`
- `src/locales/en/translation.json`
- `src/locales/de/translation.json`

No se toca backend, carrito, checkout ni suscripciones con este cambio. El aviso es solo informativo.

Nota
----
Si más adelante quieres restringir también las compras de una sola vez al checkout (no solo las entregas de suscripción), sería un cambio aparte en el flujo de pago.