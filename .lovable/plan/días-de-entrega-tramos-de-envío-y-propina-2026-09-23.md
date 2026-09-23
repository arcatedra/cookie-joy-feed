# Días de entrega, tramos de envío y propina

Todo esto va sobre el marketplace de tiendas. No se toca el checkout de galletas
ni las tablas de usuarios/clientes. Nada se publica.

---

## 1. Días de entrega: lunes, miércoles y viernes

El día de entrega ya se elige en la tienda antes de pagar. Se limita a
lunes, miércoles y viernes: los demás días ni siquiera aparecen como opción.

Estos tres días quedan como valor por defecto en el panel de administrador,
por si más adelante quieres cambiarlos por zona.

## 2. Hora límite de corte

Un día de entrega solo se ofrece si el pedido se hace antes de la hora límite
del día anterior (por defecto 8:00 PM, hora de Nueva York, editable en el panel).

Ejemplo: domingo 11 PM → el lunes ya no aparece; la primera opción es el miércoles.

La misma regla se vuelve a verificar en el servidor al pagar, para que nadie
pueda forzar una fecha ya cerrada.

## 3. Total del carrito en tiempo real

Al sumar o quitar productos, el carrito ya recalcula el subtotal; se le agrega
la línea del envío según el tramo y la propina, con el total final siempre visible.

## 4. Tramos automáticos por monto del pedido

Según el subtotal del carrito, el pedido se clasifica solo:

| Tramo | Subtotal | Envío | Repartidor | Empresa |
|---|---|---|---|---|
| Chico | hasta $50 | $10 | $4 | $6 |
| Mediano | $50 a $120 | $18 | $6 | $12 |
| Grande | más de $120 | $35 | $10 | $25 |

Los umbrales y los tres montos (total, repartidor, empresa) son editables en el
panel; los $50 y $120 son solo el valor inicial.

El cargo se suma automáticamente al total a pagar. El tramo se guarda en el
pedido para el pago al repartidor.

**Nota importante:** hoy el marketplace cobra un "cargo de servicio" (el mayor
entre $15 y 18%) más un cargo por peso. Este nuevo envío por tramos **reemplaza
al cargo de servicio**; el cargo por peso se mantiene tal cual (hasta 45 lb
incluido, +$5, +$9, tope 120 lb). Si prefieres que también reemplace al cargo por
peso, dímelo y lo ajusto antes de aplicar.

## 5. Propina opcional

En el checkout de la tienda: botones $2, $3, $5 y "otro monto", además de "sin
propina". Se suma al total y va 100% al repartidor. Se guarda en el pedido y
entra en el pago del repartidor.

## 6. Pedidos agrupados por zona en el panel del supermercado

En el panel de pedidos del negocio, los pedidos se agrupan por código postal
(encabezado con el código y la cantidad de pedidos), ordenados por zona y por
hora. Así un repartidor puede tomar varios pedidos cercanos.

## 7. Panel de administrador

Se amplía /admin/precios con una sección nueva "Envío por tramos y horarios":
umbrales de cada tramo, monto total / repartidor / empresa de cada uno, hora
límite de corte y días de entrega permitidos. Todo sin tocar código.

---

## Base de datos (migración, pendiente de tu OK)

- `pricing_settings`: nuevas claves (umbrales chico/mediano, los nueve montos de
  los tres tramos, hora límite de corte, días de entrega permitidos).
- `store_orders`: nuevas columnas `tramo` (chico/mediano/grande),
  `envio_repartidor`, `envio_empresa`, `propina`.
- Sin cambios en usuarios, clientes ni en nada de galletas.

## Archivos (resumen técnico)

Modificados: `src/lib/pricing.ts` (tramos, corte, días), `pricing.functions.ts`,
`src/routes/_authenticated/admin.precios.tsx`, `src/routes/tienda.$slug.tsx`
(días permitidos, corte, propina, desglose), `src/lib/store-checkout.functions.ts`
(validación de fecha, tramo, propina, totales), `src/lib/store-orders.functions.ts`
(recálculo al capturar con tramo real), `src/routes/_authenticated/negocios.pedidos.tsx`
(agrupación por código postal). Reutiliza `TipSelector.tsx`. Traducciones es/en.

## Orden de trabajo

1. Migración → 2. cálculo de tramos, días y corte → 3. carrito y propina →
4. /admin/precios → 5. agrupación por zona en el panel del negocio.
