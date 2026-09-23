# Pagos inmediatos sin tarea diaria

Sin migración de base de datos. Todo sigue en modo prueba de Stripe. El checkout de galletas no se toca.

## Qué va a pasar

1. **Tienda cobra al momento**: cuando la tienda marca "Listo para recoger" y se cobra el pedido, en ese mismo paso se le transfiere el valor de sus productos a su cuenta Stripe. Si no ha conectado su cuenta, queda "pendiente".
2. **Pendientes se pagan solos**: cuando Stripe avisa que una tienda o un repartidor terminó de conectar su cuenta, se envían en ese momento todas sus transferencias pendientes o fallidas.
3. **Fallidas se reintentan solas**: cada vez que pasa algo con esa cuenta (otro cobro de la tienda, otra entrega del repartidor, o un aviso de Stripe), se reintentan también sus transferencias anteriores sin pagar.
4. **Respaldo manual**: se quedan "Reintentar" y "Ejecutar ahora" en Transferencias.
5. **/admin/precios**: se quita "Pago a súpers: cada cuántos días" y se muestra el texto fijo "Pago a súpers: inmediato al cobrar".
6. **Nunca dos veces**: cada transferencia lleva su clave única por pedido (ya existe: `store-payout-<pedido>` y `driver-payout-<pago>`); además se revisa antes si ya está pagada.

## Detalles técnicos

- `payouts.server.ts`: nuevas funciones `flushBusinessPending(businessId)` y `flushDriverPending(driverId)` que recorren lo no pagado de esa cuenta (máx. 50) y llaman a `transferStoreOrder` / `transferDriverPayout`. Se quita el monto de la clave de idempotencia para que un reintento con monto recalculado no genere un segundo pago.
- `store-orders.functions.ts`: tras la captura exitosa, llamar `transferStoreOrder(id)` y luego `flushBusinessPending` (errores solo se registran, no bloquean el cobro).
- `store-delivery.functions.ts`: tras pagar al repartidor, `flushDriverPending(driverId)`.
- `connect-webhook.ts` (`account.updated`): además de `drivers`, actualizar `businesses` por `stripe_account_id`; si la cuenta queda habilitada, ejecutar el flush correspondiente. Se corrige que el estado se guarde con los valores que usa la app (`none|pending|complete`).
- `admin.precios.tsx`: quitar el campo editable; mostrar etiqueta "inmediato".
- Confirmar que el evento `account.updated` de cuentas conectadas llega a este webhook en modo prueba; si no está suscrito, lo indico.
