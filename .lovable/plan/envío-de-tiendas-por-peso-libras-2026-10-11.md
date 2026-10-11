# Envío de tiendas por peso (libras)

Solo para el marketplace de tiendas. No se toca Stripe, propinas, galletas ni datos de clientes. No se publica.

## Nuevas reglas de entrega

| Peso total del pedido | Tamaño | Entrega |
|---|---|---|
| hasta 15 lb | Chico | $12 |
| más de 15 hasta 30 lb | Mediano | $25 |
| más de 30 hasta 45 lb | Grande | $39.99 |
| más de 45 lb | Grande | $39.99 + $0.80 por cada libra extra |

Ejemplo: pedido de 50 lb → $39.99 + 5 × $0.80 = $43.99.

- Sin cargo de servicio (el 18% / mínimo $15 deja de cobrarse).
- Sin recargo de procesamiento (el 3% deja de sumarse).
- El tamaño ya no depende del subtotal en dólares.
- El peso máximo por pedido (120 lb) y el aviso de dividir el pedido se quedan igual.
- El reparto interno repartidor/empresa de cada tamaño se queda como está hoy (editable en el admin).
- Al preparar el pedido se recalcula con el peso real, igual que hoy.

## Panel /admin/precios

- "Tramo chico hasta ($)" → "Chico hasta (lb)" = 15.
- "Tramo mediano hasta ($)" → "Mediano hasta (lb)" = 30.
- Grande hasta 45 lb (las libras incluidas) y precio por libra extra = $0.80.
- Precios: chico $12, mediano $25, grande $39.99.
- Se quitan los campos "Tramo 2" y "Tramo 3" de peso, y los de cargo de servicio y recargo de procesamiento.

## Detalle técnico

- `src/lib/pricing.ts`: nuevas claves `tier_small_max_lb` / `tier_medium_max_lb`; `tierForWeight(lb)` reemplaza `tierForSubtotal`; `serviceFeeCents` y `processingFeeCents` devuelven 0 para tiendas; `weightFeeCents` solo cobra sobre 45 lb a $0.80.
- `store-checkout.functions.ts` y `store-orders.functions.ts`: usar el tamaño por peso; no sumar servicio ni procesamiento. El cobro con Stripe se hace igual (solo cambia el monto calculado).
- `tienda.$slug.tsx`: el carrito muestra la entrega según el peso.
- `admin.precios.tsx`: campos en libras, quitar Tramo 2/3, servicio y procesamiento.
- Valores nuevos guardados en la tabla de ajustes de precios (solo filas de ajustes, sin cambiar estructura).
- Actualizar la prueba automática del marketplace y textos es/en si mencionan "cargo de servicio".
