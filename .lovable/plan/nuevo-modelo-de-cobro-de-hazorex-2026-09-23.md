# Nuevo modelo de cobro de Hazorex

Tres bloques: quitar suscripciones, cobrar por pedido en el marketplace, y bono de $5 por referido.
Nada se aplica hasta tu OK. No se toca el checkout de galletas ni la tabla de clientes/usuarios.

---

## 1. Eliminar suscripciones

**En la web** se quitan: la página de planes, el modal de pago de suscripción, el aviso
"Suscríbete para comprar", el contador de entregas del plan, los enlaces en el menú, el pie
de página y la barra inferior, y el bloque "Suscripción" de Mi cuenta (se reemplaza por el
saldo de referidos). Las páginas de tienda y carrito dejan de pedir suscripción.

**En Stripe**: una acción de una sola vez, que yo ejecuto y tú confirmas, que marca todas las
suscripciones activas para **cancelarse al final del periodo ya pagado**. Nadie pierde días
pagados y nadie recibe un cobro nuevo. No se cancelan al instante ni se reembolsa.

**Correo**: a cada persona con suscripción activa, un aviso nuevo
("Hazorex ahora cobra por pedido, tu plan no se renovará y no habrá más cobros").
Se envía una sola vez por persona.

Los datos de las suscripciones se conservan (solo quedan inactivos). No se borra nada de
usuarios ni de clientes.

---

## 2. Cobro por pedido en el marketplace

**Cargo de servicio**: el mayor entre $15 y el 18% del pedido.

**Peso** (suma del peso de cada producto por su cantidad):

| Peso del pedido | Cargo extra |
|---|---|
| hasta 45 lb | incluido |
| 45 a 80 lb | +$5 |
| 80 a 120 lb | +$9 |
| más de 120 lb | bloqueado |

Mensaje de bloqueo: "Máximo 120 lb por pedido. Divide tu compra en 2 pedidos."

**En el carrito**: una barra que dice "Tu pedido pesa X lb de 45 lb incluidas" y, al pasar
de 45 lb, el aviso "Se agregará un cargo por peso de $X, que se cobra automáticamente al pagar."
Pasando de 120 lb el botón de pagar se desactiva.

**Día de entrega**: el cliente elige entre los días de ruta de su zona (configurables en
/admin/precios). El día elegido se guarda en el pedido.

**Cobro**: no cambia la mecánica que ya existe. Al confirmar se reserva el total + 15%.
Cuando la tienda marca "Listo para recoger", se recalcula todo con el peso real
(productos + servicio + peso) y se cobra solo ese monto final, siempre con el tope de la
reserva. Nada se cobra aparte.

**Reparto**: los pedidos de más de 45 lb solo se ofrecen a repartidores con vehículo "auto".

**Pago al repartidor**: $5.50 por parada + $0.10 por artículo pasados los 30 artículos +
60% del cargo por peso + 100% de la propina.

**/admin/precios** (solo admin): una pantalla para editar todos estos valores —
mínimo y porcentaje del cargo de servicio, los tres tramos de peso y sus cargos, el tope de
120 lb, el peso por defecto de un producto, los pagos al repartidor y los días de ruta por zona.

También se agrega el campo **peso (lb)** al formulario de productos del negocio, con 1 lb por defecto.

---

## 3. Referidos con QR y saldo de $5

Cada usuario ya tiene su código; se añade la tarjeta con su **QR** a hazorex.com/join/CODIGO
para compartir o descargar.

**Cuándo se paga**: cuando el invitado completa su **primera compra** y ese pedido queda
**entregado** sin reembolso, se abonan **$5 al saldo de quien invitó**, automáticamente.

**Saldo**: se ve en Mi cuenta con su historial, y se descuenta solo en la siguiente compra
(hasta el total del pedido). No se retira en efectivo.

**Antifraude**: un solo bono por cliente nuevo; nadie puede usar su propio código; se bloquea
el bono si la cuenta nueva repite teléfono, dirección o tarjeta (huella de la tarjeta que ya
entrega Stripe) de otra cuenta. Los bloqueos quedan registrados para revisión del admin.

---

## Base de datos (migración, pendiente de tu OK)

- `store_products`: nueva columna `peso_lb` (por defecto 1).
- `store_orders`: nuevas columnas `peso_total_lb`, `cargo_servicio`, `cargo_peso`,
  `fecha_entrega`, `credito_aplicado`; y las mismas columnas recalculadas al capturar.
- `pricing_settings`: tabla de un solo registro por clave con todos los valores editables en
  /admin/precios (lectura pública de los valores necesarios para cotizar; solo admin escribe).
- `zone_delivery_days`: día(s) de ruta por zona (lectura pública, escritura admin).
- `wallet_credits`: movimientos de saldo del usuario (motivo, monto, pedido asociado).
  Solo el dueño lee lo suyo; nadie escribe desde la app (lo escribe el servidor).
- `referral_rewards`: un registro por invitado, con estado (pendiente / pagado / bloqueado)
  y motivo de bloqueo. Único por invitado, para que nunca se pague dos veces.
- `account_fingerprints`: teléfono, dirección y huella de tarjeta normalizados por cuenta,
  para detectar cuentas repetidas.
- Todo con RLS y los permisos correspondientes; nada toca `clientes` ni `auth.users`.

## Archivos (resumen técnico)

Nuevos: `src/lib/pricing.ts` (cálculo de servicio/peso compartido), `pricing.functions.ts`,
`wallet-credits.functions.ts`, `referral-rewards.server.ts`,
`src/routes/_authenticated/admin.precios.tsx`, plantilla de correo `subscription-sunset`.
Modificados: `store-checkout.functions.ts` (cargos, peso, día, crédito),
`store-orders.functions.ts` (recálculo al capturar + disparo del bono al entregar),
carrito de tienda, panel de productos del negocio, `mi-cuenta.tsx`, `InviteCodeCard.tsx` (QR),
asignación de rutas (filtro de auto), pagos del repartidor, y borrado de las pantallas y
componentes de suscripción. Traducciones en los 9 idiomas (es/en escritos, resto con respaldo).

## Orden de trabajo

1. Migración (tras tu OK) → 2. cálculo de precios + carrito + checkout →
3. /admin/precios → 4. referidos y saldo → 5. quitar suscripciones + correo + cancelación en Stripe.

Nada se publica: tú revisas en la vista previa.
