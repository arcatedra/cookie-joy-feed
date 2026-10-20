# Mejoras al Pedido especial del Supermercado

## Qué verá el cliente
1. **Anuncio más llamativo:** la tarjeta de "Pedido especial" tendrá color fuerte (fondo del color principal), ícono de cámara grande y texto "¿No lo encuentras? Mándanos la foto y lo compramos por ti".
2. **Precio obligatorio y grande:** el campo de precio ya es obligatorio; se mostrará con letra grande en el formulario, en el carrito y en la pantalla del pedido del shopper/admin.
3. **Campo nuevo obligatorio "Supermercado":** el cliente escribe el nombre del supermercado y la dirección o zona (ej: "Food Bazaar, 1750 Jerome Ave, Bronx"). Se muestra al cliente en el carrito, y al admin y al shopper en el pedido.
4. **Regla de un solo supermercado:** si el cliente intenta agregar un artículo especial de otro supermercado en el mismo pedido, se bloquea con el mensaje: "Todos los artículos del pedido deben ser del mismo supermercado". Se valida en el formulario y también en el servidor al pagar.

## Lo que NO cambia
- Checkout, Stripe, precios, productos existentes, fotos. No se publica.

## Detalles técnicos
- **Migración (1):** columna nueva opcional `supermercado_especial TEXT` en `store_order_items` (sin GRANTs nuevos: la tabla ya existe; no toca políticas ni datos existentes).
- `src/lib/special-order-rules.ts`: agregar campo `supermercado` (obligatorio, 3–120 caracteres) al esquema y función `assertSameSupermarket` que lanza el mensaje exacto si difieren.
- `src/components/SpecialOrderForm.tsx`: diseño destacado (fondo primary, ícono Camera), campo supermercado obligatorio, precio grande, bloqueo al mezclar supermercados.
- `src/lib/store-checkout.functions.ts`: validar en servidor que todos los especiales sean del mismo supermercado y guardar `supermercado_especial`.
- `src/routes/tienda.$slug.tsx` (barra del carrito) y `src/routes/_authenticated/compra.$id.tsx` (vista del pedido): mostrar supermercado y precio en grande.
- `src/lib/special-order-rules.test.ts`: 3 pruebas nuevas (campo obligatorio, mismo supermercado acepta, distinto supermercado rechaza con el mensaje exacto).
- Verificación: una sola corrida de vitest de ese archivo de pruebas.
