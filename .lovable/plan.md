# Pago del marketplace: reservar primero, cobrar lo real

## Antes que nada: una corrección

Revisé el código y **los pedidos del marketplace todavía no existen**. No hay ningún
pedido en estado `pendiente_pago` ni tabla de pedidos de tiendas: la Fase 1 dejó el
catálogo público, pero sin carrito ni pedidos. Lo que sí existe es el flujo de
autorización y captura de las **galletas** (pedido → reserva → captura en /admin/empaque),
ya funcionando en modo prueba.

Así que este paso incluye dos cosas: crear el pedido de tienda y conectarle el pago
con reserva y cobro final, exactamente con las reglas que pediste.

## Cómo funcionará

1. **Al confirmar el pedido**: se reserva (hold) el total + 15% (mínimo $5, el mismo
   ajuste configurable que ya usan las galletas). El pedido queda en `confirmado`.
2. **Cuando la tienda marca "Listo para recoger"**: se cobra solo el monto real.
3. **Si el real es menor**: se cobra menos y la reserva sobrante se libera sola.
   Sin reembolsos.
4. **Si el real supera la reserva**: se cobra hasta el tope reservado y la diferencia
   queda marcada como "ajuste pendiente" en el pedido, para quitar o reemplazar artículos.
   Nunca se cobra de más sin permiso.
5. **Comisión de Hazorex**: se guarda dos veces en el pedido — la estimada al reservar
   y la definitiva al cobrar, calculada con el porcentaje de cada tienda.

## Archivos que cambian

Nuevos:
- `src/lib/store-checkout.functions.ts` — crea el pedido de tienda y abre el pago con reserva.
- `src/lib/store-orders.functions.ts` — cobro final, liberación y consulta de pedidos (tienda y cliente).
- `src/routes/_authenticated/negocios.pedidos.tsx` — pantalla de la tienda con el botón "Listo para recoger".
- `src/routes/_authenticated/mis-pedidos.tienda.$id.tsx` — detalle del pedido para el cliente.

Modificados:
- `src/routes/api/public/payments/webhook.ts` — reconocer el nuevo tipo de pedido (`store_order`) y marcarlo `confirmado` al autorizarse.
- `src/lib/store.ts` — tipos y estados del pedido.
- Traducciones en `src/locales` (es/en, resto con respaldo en inglés).

No se toca: `cart-checkout.functions.ts`, `order-capture.functions.ts`, `/admin/empaque`
ni la tabla `pedidos`. El checkout de galletas queda intacto.

## Cómo se separa del checkout de galletas

- Tablas distintas: los pedidos de tienda viven en `store_orders` / `store_order_items`,
  no en `pedidos`.
- Funciones distintas: ningún archivo del checkout de galletas se edita.
- Marca distinta en Stripe: cada pago lleva `kind: "store_order"` (las galletas usan
  `cookie_order`), y el webhook decide por esa marca. Si la marca no coincide, lo ignora.
- Se reutiliza solo lo neutral: el cliente de Stripe (`stripe.server.ts`) y el ajuste del 15%.

## Base de datos (migración, pendiente de tu OK)

- `store_orders`: tienda, cliente, dirección, subtotal, envío, total estimado, monto
  reservado, monto cobrado, comisión estimada, comisión final, estado
  (`pendiente_pago` → `confirmado` → `preparando` → `listo` → `entregado` / `cancelado`),
  referencia de Stripe, intentos y error de cobro, ajuste pendiente.
- `store_order_items`: producto, nombre y precio congelados al comprar, cantidad,
  cantidad real recogida.
- Reglas de acceso: el cliente ve solo sus pedidos; la tienda ve solo los suyos;
  el admin ve todo. Nadie puede cambiar montos ni comisiones a mano desde la app.

## Si falla el cobro

- Se reintenta hasta 3 veces guardando el error; el pedido no avanza y queda visible
  en una lista de "cobros con problema" para el admin.
- La reserva de Stripe dura 7 días; si en ese plazo no se cobra, el dinero se libera
  solo y el pedido se cancela sin cargo al cliente.
- Cada intento usa una clave única, así que un doble clic nunca cobra dos veces.
- Si la tarjeta falla al cobrar (fondos, banco), el cliente recibe aviso para pagar
  de nuevo y el pedido queda en espera; la tienda no entrega hasta que el cobro pase.

## Cómo lo probamos antes de producción

Todo en el modo de prueba de Stripe que ya está activo:
1. Pedido de prueba con tarjeta 4242 4242 4242 4242 → verificar que aparece como
   "reservado" (no cobrado) por el total + 15%.
2. Marcar "Listo para recoger" con un artículo faltante → verificar que se cobra menos
   y que la diferencia se libera sola.
3. Caso al revés: aumentar el peso por encima de la reserva → verificar que se cobra
   el tope y queda el ajuste pendiente.
4. Tarjeta que falla al cobrar (4000 0000 0000 0259) → verificar los reintentos y el aviso.
5. Dejar un pedido sin cobrar y confirmar que a los 7 días la reserva se libera.
6. Revisar que un pedido de galletas hecho en paralelo sigue funcionando igual.

Nada se publica: tú revisas en la vista previa.

## Lo que NO incluye este paso

Reparto y asignación de repartidor para pedidos de tienda, propinas y pagos a las
tiendas (payouts). Eso va en el siguiente paso.
