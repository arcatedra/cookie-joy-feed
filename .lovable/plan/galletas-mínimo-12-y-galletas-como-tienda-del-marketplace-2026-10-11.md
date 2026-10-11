# Galletas: mínimo $12 y galletas como tienda del marketplace

Toca el pago y más de 3 archivos, por eso necesito tu OK. Sin publicar, sin cobros reales, sin tocar usuarios/clientes.

## Parte 1 (rápida)
- Vuelve el pedido mínimo: $12 en productos. Si el subtotal es menor, el botón "Pagar" queda desactivado y aparece "Pedido mínimo $12 — te faltan $X".
- El servidor también lo rechaza antes de crear el pedido o abrir Stripe (aunque alguien salte la pantalla).
- La entrega de $12 se queda igual. Ejemplo: $15 + $12 = $27.
- FAQ (español e inglés): "¿Cuál es el pedido mínimo? $12 en productos, más $12 de entrega". Términos ajustados igual.
- Actualizo las pruebas automáticas (1 galleta se rechaza; $15 da $27).

## Parte 2: galletas como una tienda más
Hoy las galletas ya cobran $12 (= tamaño Pequeño), tienen la misma propina en el pago y la misma propina después de la entrega. Lo que falta es que entren en los lotes.
- Los pedidos de galletas pagados entran a los lotes como paradas tamaño Pequeño de "Hazorex Galletas", junto con los pedidos de tiendas de la misma zona (cuentan para el mínimo de 3 pedidos por lote).
- El cargo "Entrega y servicio" de galletas se calcula con la misma tabla por tamaño de las tiendas (Pequeño = $12), en vez de un valor aparte.
- El pago de galletas sigue siendo cobro inmediato (sin reserva), porque su precio es exacto; esto evita cobrar dos veces.
- Todo esto queda dentro del modelo de lotes, que sigue apagado hasta que lo pruebes.

No propongo mover los pedidos de galletas a la tabla de pedidos de tiendas: obligaría a migrar pedidos viejos y tocar datos de clientes. El resultado para el cliente y el repartidor es el mismo.

## Detalles técnicos
- `cookie-order-rules.ts`: `COOKIE_MIN_SUBTOTAL_CENTS = 1200`, `assertCookieSubtotal` exige ≥1200.
- `cart.tsx`: botón desactivado + mensaje con lo que falta.
- `cart-checkout.functions.ts`: ya llama `assertCookieSubtotal` antes de insertar; fee desde tabla por tamaño "small".
- Lotes: el armador de borradores incluye `pedidos` pagados (L/M/V, zona por ZIP) como paradas small; migración aditiva si hace falta enlazar `delivery_block_stops` a `pedidos`.
- Traducciones es/en de FAQ y Términos; actualizar `cookie-order-rules.test.ts`.
