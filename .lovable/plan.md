# Pago directo a cada supermercado + ajuste del cargo por libra

## Lo que ya funciona hoy (no se toca)

- Días de entrega solo lunes, miércoles y viernes, con hora límite del día anterior.
- Peso por producto y peso total del carrito en tiempo real.
- Tramos chico / mediano / grande con umbrales editables en el panel de administrador.
- Precio de entrega automático: precio del tramo ($12 / $18 / $35) más el cargo por libras extra. El cliente solo ve el precio final.
- Reparto interno repartidor / empresa y libras extra 100% al repartidor, invisible para el cliente y para el súper.
- Propina opcional en el checkout, 100% al repartidor.
- Pedidos agrupados por código postal en el panel del súper.
- Panel /admin/precios con umbrales, precios por tramo, reparto, libras incluidas, precio por libra, peso máximo y hora límite.

## Cambio 1: precio por libra extra

- Pasa de $0.68 a $0.70 por libra sobre las 45 libras incluidas (equivale a 20 kg y casi $1.50 por kilo).
- Sigue siendo editable desde /admin/precios.

## Cambio 2: cada súper cobra su parte directamente

Hoy todo el dinero llega a Hazorex. Con este cambio:

- Cada supermercado abre su propia cuenta de cobro desde un panel nuevo ("Cobros") dentro de su panel de negocio: un botón lo lleva a completar sus datos y vuelve solo cuando termina.
- El panel muestra el estado: sin empezar, datos pendientes o listo para recibir pagos.
- Un negocio sin la cuenta lista sigue vendiendo igual; su dinero queda retenido en Hazorex hasta que la complete.
- El cliente paga todo junto en un solo cobro, como ahora.
- Cuando el pedido se cobra de verdad (al marcar "Listo para recoger"), el sistema calcula la parte del súper (solo el valor de los productos) y se la transfiere; la entrega completa se queda en Hazorex.
- Las transferencias salen automáticamente una vez al día. La frecuencia (diaria, cada 2 días o semanal) se edita en /admin/precios.
- En cada pedido queda registrado cuánto se transfirió al súper y cuándo, visible en el panel de administrador.

## Detalles técnicos

- Migración: en `businesses`, campos `stripe_account_id`, `stripe_onboarding_status`, `stripe_payouts_enabled`; en `store_orders`, `monto_transferido_negocio`, `transferido_en`, `transfer_id`. En `pricing_settings`, `payout_frequency_days` (1 por defecto) y `weight_extra_per_lb_usd` a 0.70.
- Nuevo `src/lib/store-connect.functions.ts`: `createExpressAccountLink` (crea cuenta Express y devuelve el enlace de onboarding), `getConnectStatus` (lee estado desde Stripe y lo guarda). Solo el dueño del negocio o un admin.
- `store-checkout.functions.ts` sigue igual: el cargo va a la plataforma (separate charges and transfers), sin `transfer_data` en la sesión.
- `store-orders.functions.ts`: al capturar, marca el pedido como pendiente de transferencia con el monto de productos ya capturado.
- Nueva ruta pública `src/routes/api/public/payout-run.ts`: recorre los pedidos capturados y no transferidos cuyo negocio tiene la cuenta lista, crea el `transfer` a la cuenta conectada y guarda el resultado. Protegida por secreto en cabecera, para llamarse una vez al día.
- Todo Stripe pasa por `createStripeClient` del gateway existente; no se toca el checkout de galletas ni el flujo de pago del cliente.
- Nueva página `/negocios/cobros` y sección "Pagos a súpers" en `/admin/precios`. Traducciones es/en.
