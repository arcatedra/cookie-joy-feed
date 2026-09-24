# Arreglar el pago de las tiendas y quitar los restos de suscripciones

## 1. Botón "Pagar" de las tiendas (urgente)
**Por qué falla hoy:** el pago se pide a Stripe con un tipo de ventana que Stripe ya no acepta, así que nunca se abre la pantalla de pago. Además, el carrito se vacía antes de saber si el pago salió bien.

**Cómo quedará:**
- Al tocar "Pagar" se abre la pantalla de pago de Stripe dentro de la misma página, con la reserva del total + 15% (se cobra al final solo lo real).
- El carrito **se queda igual** mientras paga. Solo se vacía cuando Stripe confirma que el pago quedó autorizado (pantalla de "pedido confirmado").
- Si el cliente cierra la ventana o la tarjeta falla: el carrito sigue ahí y el pedido queda en "pendiente de pago". Si vuelve a tocar "Pagar", se crea un pedido nuevo y el anterior sin pagar se borra, para no llenar la lista de pedidos abandonados.
- Prueba de punta a punta con la tarjeta 4242 4242 4242 4242 en modo prueba. Para eso creo una tienda y un producto **de prueba** (marcados como prueba y fuera de la lista pública) y los borro al terminar.

## 2 y 3. Restos de suscripciones
- Se quita la verificación de plan que aún aparece en Inicio, Tienda de galletas, Buscar, Más vendidos y Arma tu caja: cualquiera con sesión puede comprar y agendar entregas.
- Se quita el aviso "Suscríbete" y la tarjeta de "entregas usadas del plan" en Perfil.
- Se deja de leer la tabla de suscripciones (y su versión en inglés) en toda la app: ya no sale "No se pudo cargar la suscripción".
- Webhook de pagos: los avisos de Stripe de suscripciones o facturas de suscripción reciben "OK" y solo se anotan en el registro, sin guardar nada. Así Stripe deja de reintentar.
- Las tablas de suscripciones y clientes **no se borran**; solo se dejan de usar.

## Lo que no se toca
El pago de galletas en sí (solo se le quita la exigencia de suscripción), la tabla de usuarios/clientes. Sin cambios en la base de datos. No se publica.

## Detalles técnicos
- `store-checkout.functions.ts`: `ui_mode: "embedded_page"`, `return_url` a `/checkout/success?kind=store&session_id=...`; borra pedidos propios previos en `pendiente_pago` sin pago; devuelve `clientSecret`.
- `tienda.$slug.tsx`: monta `EmbeddedCheckoutProvider/EmbeddedCheckout` (mismo patrón que `cart.tsx`) en un diálogo; no llama `onClear()` al crear la sesión. El carrito se guarda por tienda; se vacía en `/checkout/success` cuando la sesión está `complete` (o al volver a la tienda con ese pedido confirmado).
- `checkout.success.tsx`: rama `kind=store` que verifica la sesión y limpia el carrito de esa tienda.
- `subscription-gate.tsx`: `guard()` siempre permite; sin consulta ni canal realtime a `subscriptions`; `SubscribePromoBanner` devuelve null. Se quitan sus usos en `profile.tsx` e `index.tsx`.
- `subscription-status.server.ts` / `deliveries.functions.ts`: sin consulta a `subscriptions`; agendar no exige plan.
- `pedidos.functions.ts`: `getMySuscripcion` deja de consultar y devuelve null.
- `webhook.ts`: `customer.subscription.*` e `invoice.*` → log + 200.
- Archivos de suscripciones sin uso (`subscriptions.functions.ts`, `SubscriptionPaymentModal.tsx`, partes de `admin-dev.functions.ts`) se eliminan o se quitan sus llamadas.
