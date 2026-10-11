# Entrega fija de $12 para galletas y propina después de la entrega

## 1. Galletas: "Entrega y servicio" fija de $12
- Se quita "Envío gratis". Todo pedido de galletas paga **Entrega y servicio: $12** como una línea aparte en el carrito y en la pantalla de pago de Stripe.
- Se quita el mínimo de $12 del subtotal: se puede comprar desde 1 galleta.
- El servidor calcula los $12 por su cuenta (no confía en el navegador) y los manda a Stripe. Si el monto que llega no cuadra, el pedido no se crea.
- En el admin (pantalla de precios) se agrega:
  - "Entrega y servicio de galletas" = $12 (editable).
  - "Cargo extra por distancia" (casilla **apagada** + monto por milla). Por ahora solo se guarda y no se cobra.
- Textos actualizados en español e inglés: carrito, Términos y Preguntas frecuentes ("¿Cuál es el pedido mínimo?" → "No hay mínimo de compra; la entrega cuesta $12").
- El saldo de referidos sigue pudiendo usarse como descuento, igual que hoy.

## 2. Propina estilo Instacart/Uber (galletas y tiendas)
**En el checkout:** igual que hoy: Sin propina / $2 / $3 / $5 / Otra, y el 100% es para el repartidor. Se agrega en la pantalla de pago de Stripe la opción de **guardar la tarjeta** para una propina posterior, con el aviso de consentimiento de Stripe.

**Después de entregar:**
- Cuando el repartidor sube la foto o marca "entregado", el cliente recibe un aviso (notificación y campana).
- En su pedido verá: "¡Tu pedido llegó! ¿Quieres dejar o subir la propina a tu repartidor?" con $2 / $3 / $5 / Otra / "No, gracias".
- Solo aparece durante las 24 horas siguientes a la entrega. Después se oculta, y el servidor también lo rechaza.
- **Cobro:**
  - Si el cliente guardó la tarjeta, se cobra con ella después de que confirma en un solo toque.
  - Si no la guardó, o si el banco pide verificación, se abre una ventanita de pago de Stripe solo por la propina.
- El dinero va **100% al repartidor**, con transferencia directa a su cuenta de cobro. Tiene protección contra cobros o pagos dobles: cada propina lleva una clave única.
- Queda registrada en el pedido (propina inicial + propinas extra) y en el reporte de propinas (semanal y del admin).
- Límite por propina extra: entre $1 y $100.

## Lo que no se toca
- La tabla de usuarios y clientes.
- Los pagos de pedidos anteriores.
- El modelo de lotes, que sigue apagado.

No se publica. Las pruebas se hacen solo en modo prueba, con la tarjeta 4242.

## Pruebas
- Pruebas automáticas del cálculo: 1 galleta = subtotal + $12, sin mínimo; propina fuera de 24 h rechazada; la misma propina no se cobra dos veces.
- Prueba en modo prueba de la sesión de Stripe para galletas (línea de $12) y de un cobro de propina extra simulado.
- La prueba completa con sesión iniciada depende de tener una sesión autorizada en la vista previa.

## Detalles técnicos
- **Migración (aditiva, sin borrar nada):**
  - `pricing_settings`: claves `cookie_delivery_fee_cents` (1200), `cookie_distance_fee_enabled` (false) y `cookie_distance_fee_per_mile_cents`.
  - Nueva tabla `post_delivery_tips`: kind cookie|store, order_id, cliente_id, driver_id, amount, stripe_environment, payment_intent_id, transfer_id, status, idempotency key única, created_at. RLS: el cliente ve las suyas y el admin todas.
  - Columnas `stripe_customer_id` y `saved_payment_method_id` en `pedidos` y `store_orders`. No se toca `clientes`.
- **`cookie-order-rules.ts`:** se quita `assertCookieMinimum` y se agrega `cookieDeliveryFee(settings)`.
- **`cart-checkout.functions.ts`:** agrega la línea "Entrega y servicio"; `costo_envio` = 12; `payment_intent_data.setup_future_usage: "off_session"` con un Customer de Stripe resuelto por metadata `userId`. `store-checkout.functions.ts`: lo mismo para guardar la tarjeta.
- **Nuevo `post-delivery-tips.functions.ts`:**
  - `createPostDeliveryTip`: valida la ventana de 24 h, dueño y entregado; PaymentIntent off_session con `Idempotency-Key`; si falla o requiere acción, devuelve un `clientSecret` para una sesión embebida.
  - `listMyTipPrompt`.
- **Webhook:** `payment_intent.succeeded` con `kind=post_delivery_tip` → registra y transfiere al repartidor (`transfer_group`, `source_transaction`, clave `post-tip-${id}`).
- **Avisos:** se reutilizan el push y las notificaciones existentes al marcar entregado (`store-delivery`, entrega de galletas).
- **Interfaz:** tarjeta de propina en `mis-pedidos.tienda.$id` y en el detalle de pedido de galletas; carrito `cart.tsx`; admin de precios; Términos y FAQ en `es`/`en`.
