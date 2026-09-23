# Ajustes finales: fuera suscripciones, comisión cubierta y pagos a repartidores

## 1. Quitar las suscripciones de la web

- Quitar "Suscripciones de Galletas" del menú de arriba, del menú lateral y de la barra de abajo.
- Quitar de la portada la tarjeta del Club Hazorex ($19.99) y el banner de suscripción.
- La página `/subscribe` deja de existir: quien entre por un enlace viejo va a la tienda.
- Quitar el contador de entregas y el aviso "necesitas suscripción" que bloqueaba comprar.
- Aviso por correo a cada persona con suscripción activa: su plan se cancela al terminar el periodo que ya pagó y a partir de ahí Hazorex cobra por pedido.
- En Stripe se marcan esas suscripciones para cancelarse al final del periodo pagado (no se cobra ni se reembolsa nada).
- No se borra ni se toca la tabla de usuarios ni la de clientes. La tabla de suscripciones se conserva como historial.

## 2. Cubrir la comisión de Stripe (3%)

- Nuevo valor editable en /admin/precios: "Recargo de procesamiento (%)", inicia en 3.
- Se calcula sobre el total del pedido y se suma **dentro** del precio de entrega que ve el cliente; sigue sin verse ningún desglose.
- Ese monto es 100% para la empresa: no cambia lo que gana el repartidor ni lo que recibe el súper.
- Se aplica igual al reservar el pago y al recalcular con el peso real.

## 3. Postulaciones de repartidores

Hoy el formulario de /repartidores guarda en tablas que **no existen**, así que ninguna postulación se está guardando. Se crean:

- **drivers**: datos de la postulación (nombre, teléfono, email, zona de trabajo, estado de la solicitud, fecha).
- **driver_vehicles**: tipo de vehículo (bicicleta, moto, auto) y sus datos.
- **driver_documents**: los documentos subidos según el vehículo.
- El SSN/ITIN sigue guardándose cifrado en la tabla que ya existe para eso; nadie lo ve en texto.
- Permisos: cada repartidor ve y edita solo lo suyo; el administrador ve todas las postulaciones y aprueba o rechaza.
- Se prueba el envío del formulario de punta a punta.

## 4. Stripe Connect para repartidores

- Nueva página en el panel del repartidor para abrir su cuenta Express: él pone sus datos bancarios directamente en Stripe, nosotros nunca los vemos. Muestra el estado (sin empezar / faltan datos / lista).
- Al marcar un pedido como **Entregado** se registra su pago: su parte del tramo + el cargo por peso + 100% de la propina.
- Si todavía no conectó su cuenta, el pago queda **pendiente** y se envía solo cuando la conecte.
- Nueva pantalla de administrador con todas las transferencias (repartidores y súpers): pagadas, pendientes y fallidas, con botón de reintentar.
- Todo arranca en modo prueba de Stripe.

## Nota técnica

Migración: tablas `drivers`, `driver_vehicles`, `driver_documents`, `driver_payouts` (monto, desglose, estado, transfer_id, error) con GRANT + RLS; columnas `stripe_account_id`, `stripe_onboarding_status`, `stripe_payouts_enabled` en `drivers`; `pricing_settings.processing_fee_pct = 3`.
Código: `src/lib/pricing.ts` (processingFeeCents), `store-checkout.functions.ts` y `store-orders.functions.ts` (suma dentro del envío), `admin.precios.tsx`, nuevo `driver-connect.functions.ts` reutilizando `stripe.server.ts`, nueva ruta `/repartidor/cobros`, nueva `/admin/transferencias`, `payout-run.ts` ampliado para pagar también a repartidores pendientes. Quitar/redirigir `subscribe.tsx` y limpiar enlaces; correo `subscription-sunset` y cancelación `cancel_at_period_end` en Stripe. El checkout de galletas no se toca.
