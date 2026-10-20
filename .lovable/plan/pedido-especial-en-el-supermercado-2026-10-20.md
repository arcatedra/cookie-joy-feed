# Pedido especial en el Supermercado

## Qué verá el cliente
- En /supermercado, una tarjeta "Pedido especial" (¿no encuentras algo? pídelo).
- Formulario: foto del producto, marca, tamaño, cantidad y precio por unidad.
- Al guardar, se agrega al carrito como un artículo más y se paga con el mismo pago de siempre (con envío por peso y propina como hoy). No se pide recibo.

## Qué verán el admin y el shopper
- En el pedido aparece el artículo especial con su foto, marca, tamaño, cantidad y precio.
- Botón "No encontrado": se quita ese artículo del cobro; si era lo único del pedido, se cancela el pedido completo y se libera la reserva de la tarjeta (nada se cobra). Si ya estaba cobrado, se reembolsa el total del artículo.

## Lo que NO cambia
- Precios y productos existentes, checkout y conexión con Stripe, propinas, clientes. No se publica.

## Detalles técnicos
- Migración: columnas nuevas opcionales en `store_order_items` (`especial` boolean, `foto_url`, `marca`, `tamano`, `precio_cliente`) y lectura de fotos especiales solo para dueño del pedido, admin y repartidor asignado (bucket privado existente `store-media`, carpeta `special/<user>`).
- El checkout de tienda ya valida precios con el catálogo; se añade una rama que acepta artículos especiales con precio declarado (límite por artículo, p. ej. $200, y cantidad 1–20), sin tocar el flujo de cobro.
- "No encontrado" reutiliza el ajuste de cobro existente (artículo faltante = $0 al capturar), que ya equivale a reembolso total de ese artículo porque la tarjeta solo está reservada.
- Archivos: `supermercado.tsx`, `store-checkout.functions.ts` (validación), `compra.$id.tsx` y vista admin del pedido, más una prueba de la regla de precio declarado.
