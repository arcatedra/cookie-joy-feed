# Cobrar el monto real: autorizar primero, cobrar al final

Hoy se cobra todo al hacer el pedido. Si falta algo o la carne pesa distinto, hay que devolver dinero. La propuesta cambia eso: al pedir se **reserva** dinero en la tarjeta; cuando el súper termina de empacar, se **cobra solo lo real**.

## Cómo quedaría

1. Al hacer el pedido: se reserva (autoriza) el estimado + 15%. No es un cobro, es una retención en la tarjeta del cliente.
2. Cuando el empaque termina: se cobra el monto real.
3. Si el real es menor: se cobra menos y la retención sobrante se libera sola. Sin reembolsos.
4. Si el real supera la reserva: se cobra hasta el tope reservado y la diferencia se resuelve quitando artículos del pedido (o dejando el sobrante sin cobrar, según lo que elijas — ver "Decisiones pendientes").

Aviso importante: una retención en Stripe caduca a los **7 días**. Si un pedido no se empaca antes, la reserva se pierde y hay que volver a cobrar. Los pedidos del mismo día no tienen problema.

## Qué cambia en la práctica para el cliente

- En el resumen de pago verá "Reservado: $X (estimado + 15%)" y "Se cobrará solo lo que realmente se empaque".
- Al terminar el empaque recibe un aviso con el total final.
- En su banco puede ver primero una retención y luego el cargo definitivo; algunos bancos tardan 1–3 días en soltar la diferencia. Esto genera preguntas de clientes: hay que explicarlo en la pantalla de pago y en el correo.

## Archivos que cambian

Pago (zona sensible, hoy intocable por tus reglas — requiere tu permiso explícito):
- `src/lib/cart-checkout.functions.ts` — al crear el pago se pide "autorizar, no cobrar" y se reserva el estimado +15%.
- `src/routes/api/public/payments/webhook.ts` — hoy marca el pedido como pagado cuando llega el pago. Pasa a marcarlo como "autorizado" y solo lo marca pagado cuando llega el cobro real.
- `src/lib/stripe.server.ts` — pequeña función nueva para cobrar (capturar) un monto.

Nuevo:
- `src/lib/order-capture.functions.ts` — cobrar el monto real de un pedido, cancelar la reserva, y recalcular el total según lo que se empacó.
- Pantalla de almacén `/admin/empaque` (o un botón dentro de la pantalla de sustituciones ya prevista): "Terminé de empacar → cobrar $X real".

Textos:
- `src/locales/es/translation.json` y `en/translation.json` (y copia al resto).

Pantallas que solo muestran el nuevo estado:
- `src/routes/cart.tsx`, `src/routes/checkout.success.tsx`, `src/routes/_authenticated/mis-pedidos.tsx`, `src/routes/_authenticated/pedido.$id.seguimiento.tsx`.

## Migración de base de datos

En `pedidos` se agregan campos: monto autorizado, monto capturado, fecha de autorización, fecha de captura, y se amplían los estados a `autorizado` / `pagado` / `autorizacion_fallida` / `autorizacion_vencida`. No se toca la tabla de clientes ni de usuarios.

## Pedidos que ya están en curso

No se tocan. Los pedidos creados antes del cambio siguen con el flujo actual (cobro completo al pedir) y se completan igual. El nuevo flujo aplica solo a pedidos creados después. Por eso hay que mantener ambos caminos activos unas semanas: el webhook reconoce si el pedido es "viejo" (ya cobrado) o "nuevo" (autorizado).

## Qué se rompe si falla el cobro final

Casos y respuesta:
- **Tarjeta rechazada al cobrar** (fondos insuficientes, tarjeta cancelada): el pedido queda en "pago pendiente", no sale a ruta, y el cliente recibe un aviso para actualizar su tarjeta. Sin reintento automático más de 2 veces.
- **La reserva caducó (7 días)**: hay que pedirle al cliente pagar de nuevo. Se evita empacando siempre dentro del plazo.
- **Falla de red en el momento del cobro**: se reintenta con una clave única para no cobrar dos veces. Este punto es crítico: sin esa clave se podría cobrar doble.
- **Nadie pulsa "terminé de empacar"**: el pedido quedaría reservado sin cobrar. Hace falta un aviso automático a las 24 h y un cobro por defecto del estimado, o se pierde el dinero al caducar.
- **Se captura de menos por error humano**: no hay vuelta atrás; solo se puede cobrar una vez por reserva. Por eso la pantalla de almacén debe mostrar el desglose y pedir confirmación.

## Cómo se prueba antes de producción

Hoy el proyecto está forzado a modo prueba de Stripe en todos los dominios, así que ninguna prueba mueve dinero real.

1. Pedido normal: reservar $50, empacar $42, cobrar $42. Verificar en Stripe que la reserva se libera.
2. Pedido que sube: reservar $50, real $58 → se cobra $50 y el sistema avisa del faltante.
3. Tarjeta que falla al cobrar (Stripe tiene tarjetas de prueba para esto): confirmar que el pedido no sale a ruta y el cliente recibe aviso.
4. Doble clic en "cobrar": confirmar que solo se cobra una vez.
5. Reserva caducada: con una reserva vieja de prueba, confirmar el mensaje correcto.
6. Pedido viejo (creado con el flujo actual): confirmar que sigue funcionando igual.

Todo esto en la vista previa. Nada se publica.

## Decisiones pendientes (necesito tu respuesta)

1. Cuando el real supera la reserva: ¿quitamos artículos hasta llegar al tope, o cobramos el tope y asumimos la diferencia?
2. ¿El 15% es fijo o quieres un mínimo (por ejemplo, +15% o +$5, lo que sea mayor)?
3. ¿Confirmas que puedo tocar los archivos de pago para esto? Tus reglas lo prohíben y necesito tu permiso explícito.

No aplico nada hasta tu OK.
