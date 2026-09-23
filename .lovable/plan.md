# Peso en kilos y cobro de entrega por tramo + peso

Todo esto es del marketplace de tiendas. No se toca el checkout de galletas, ni
Stripe, ni las tablas de usuarios/clientes. Nada se publica.

Lo que ya está hecho y se queda igual: días lunes/miércoles/viernes, hora límite
de corte, total del carrito en tiempo real, tramos chico/mediano/grande
($12 / $18 / $35) con su reparto interno ($6-$6, $6-$12, $10-$25), propina
opcional y pedidos agrupados por código postal en el panel del súper.

Lo nuevo es el peso en kilos.

---

## 1. Peso en kilos en el catálogo

Hoy cada producto guarda su peso en libras. Se cambia a kilos:

- Se agrega el campo de peso en kg a los productos y se convierten los pesos
  actuales (1 lb = 0.4536 kg), así ningún producto se queda sin peso.
- En el panel del negocio el campo pasa a decir "Peso (kg)".
- Peso por defecto si el negocio no lo pone: 0.5 kg (editable en el panel de
  administrador).

## 2. Peso total del carrito

Al agregar o quitar productos, el carrito muestra el peso total en kg junto al
total en dólares, actualizado al instante.

## 3. Cobro de entrega

El cliente ve un solo precio final. Por dentro:

```
entrega = precio del tramo + max(0, (peso_kg - 20) * 1.50)
```

Ejemplo: pedido grande de 40 kg → 35 + 20 × 1.50 = $65.

Los 20 kg incluidos y el $1.50 por kilo extra son editables en el panel de
administrador. Se elimina el antiguo cargo por peso en libras (45/80/120 lb) y
el límite de 120 lb; en su lugar queda un peso máximo por pedido en kg también
configurable (valor inicial: 55 kg, equivalente a las 120 lb de hoy), con el
mismo aviso de dividir la compra en dos pedidos.

## 4. Reparto interno (nunca visible para el cliente ni el súper)

- El precio del tramo se reparte como hoy (chico $6/$6, mediano $6/$12,
  grande $10/$25).
- El cargo por kilos extra va 100% al repartidor, aparte de su parte del tramo.
- Se guarda en cada pedido y se ve solo en el panel de administrador y en la
  ganancia del propio repartidor.

## 5. Panel de administrador

En /admin/precios, la sección de envío queda con: umbrales de tramo en dólares,
precio de cada tramo, reparto repartidor/empresa de cada tramo, kilos incluidos,
precio por kilo extra, peso máximo por pedido, peso por defecto de un producto,
hora límite de corte y días de entrega. Todo sin tocar código.

---

## Base de datos (migración, pendiente de tu OK)

- `store_products`: nueva columna `peso_kg` (por defecto 0.5) con los pesos
  actuales convertidos desde libras.
- `store_orders`: nueva columna `cargo_peso_repartidor` (los kilos extra que van
  al repartidor). `cargo_peso` se sigue usando como el cargo total por peso.
- `pricing_settings`: nuevas claves de kilos incluidos (20), precio por kilo
  extra (1.50), peso máximo (55 kg) y peso por defecto (0.5 kg).
- Sin cambios en usuarios, clientes ni en nada de galletas.

## Archivos (resumen técnico)

`src/lib/pricing.ts` (cálculo en kg, nuevas claves), `src/lib/pricing.functions.ts`,
`src/routes/_authenticated/admin.precios.tsx`, `src/routes/tienda.$slug.tsx`
(peso en kg del carrito, total final), `src/lib/store-checkout.functions.ts`
(cargo por kilos y parte del repartidor), `src/lib/store-orders.functions.ts`
(recálculo con el peso real al empacar), `src/lib/store.functions.ts` y
`src/routes/_authenticated/negocios.panel.tsx` (campo kg), y la ganancia del
repartidor. Traducciones es/en.

## Orden de trabajo

1. Migración → 2. cálculo en kg → 3. carrito y catálogo → 4. /admin/precios →
5. pago del repartidor.
