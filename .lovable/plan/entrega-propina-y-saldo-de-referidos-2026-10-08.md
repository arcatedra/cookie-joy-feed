# Entrega, propina y saldo de referidos

## Lo que funciona hoy

| Punto | Estado comprobado en el código y permisos actuales |
|---|---|
| Propina de tienda | Está al final del carrito de `/tienda/$slug`, antes de Pagar: Sin propina, $2, $3, $5 y campo de otra cantidad; comienza en $0. Se guarda en el pedido y el cálculo del pago al repartidor incluye el 100%. No es una prueba de transferencia realizada. |
| Propina de galletas | No existe en `/cart`, al comprar desde `/shop`. |
| Recompensa de referido | Solo se genera al entregar el primer pedido de tienda, no al cobrarlo; las galletas no generan recompensa. |
| Descuento con saldo | Funciona en tienda; galletas todavía no lo utiliza. |
| Saldo e historial | `/mi-cuenta` muestra saldo y los últimos 25 movimientos, sin retiro del saldo de referidos. |
| Retiro actual | Es manual: el afiliado solicita y el administrador paga fuera de la app y marca Pagado en `/admin/withdrawals`. No envía dinero mediante Stripe. Solo funciona con las comisiones antiguas de afiliados por suscripción, separadas del saldo actual de referidos. |

## 1. Texto de entrega en español e inglés

- Sustituir los mensajes generales de entrega en páginas, pie, carrito y textos de envío que se muestran al pagar por los textos exactos:
  - ES: **Pide el día antes y recibe en 24 horas: lunes, miércoles y viernes**.
  - EN: **Order the day before, get it in 24 hours: Monday, Wednesday and Friday**.
- Conservar las fechas concretas del pedido, los días permitidos y la hora de cierre; no cambiar tarifas ni el calendario para hacer este ajuste de texto.

## 2. Propina opcional en ambas compras

- Mantener la propina de tienda y añadirla al carrito de galletas.
- Mostrar los mismos controles en ES/EN: Sin propina, $2, $3, $5 y Otra cantidad. Selección inicial: Sin propina.
- Mostrar la propina por separado en el total y guardar el importe en el pedido. Validar el monto en el servidor; no cobrar una propina no elegida.
- Incluirla en la reserva y en el cobro final sin duplicarla ni convertir el margen de autorización en propina.
- En galletas, completar el registro y pago al repartidor asignado para que reciba el 100% al entregar. Si no hay repartidor con cuenta lista, el pago queda pendiente y visible, nunca se da por pagado.
- Conservar la conexión de cobro actual de repartidores, las transferencias ligadas al cargo original y sus protecciones contra pagos duplicados.

## 3. Referidos: $5 al cobrarse la primera compra

- Generar la recompensa cuando Stripe confirme un cobro efectivo de productos de tienda o galletas, nunca al reservar ni esperar a la entrega.
- Un único bono de $5 por invitado entre ambos tipos de compra. Sin límite de invitados: diez primeras compras válidas generan $50.
- Impedir autorreferidos y proteger la relación con quien invitó frente a cambios manipulados desde el navegador, sin modificar datos de usuarios o clientes.
- Registrar bono y abono de saldo juntos, de manera que reintentos o eventos simultáneos no dupliquen ni pierdan los $5.
- Mantener controles antifraude existentes sin inventar límites de invitados. No recalcular ni modificar bonos históricos en esta revisión.
- Separar saldo de prueba y saldo real: una compra en prueba no debe crear saldo gastable o retirable en producción.

## 4. Descuentos y retiro simple y seguro

**Propuesta: retiro manual por el administrador**, reutilizando la pantalla actual; no hace falta conectar una cuenta Stripe para quien invita.

- En `/mi-cuenta`, mostrar saldo disponible, movimientos con más resultados, bonos y solicitudes de retiro con su estado.
- Permitir usar el saldo como descuento en compras de tienda y galletas, con un desglose claro. La propina sigue destinándose íntegra al repartidor.
- Al solicitar retiro, apartar el saldo inmediatamente: no puede gastarse y retirarse a la vez. Validar importe, propiedad y saldo disponible dentro de una única operación protegida.
- El administrador hace el pago **fuera de Hazorex** y solo después registra Pagado y una referencia no sensible. Marcar Pagado no envía dinero automáticamente.
- Si rechaza la solicitud, devolver exactamente el saldo apartado, una sola vez.
- Distinguir retiros de referidos y comisiones antiguas para no mezclar saldos ni alterar solicitudes históricas.
- Quitar la posibilidad de crear solicitudes con cualquier importe directamente desde el navegador; solo se aceptan solicitudes respaldadas por saldo.
- No pedir ni guardar SSN, ITIN ni números de cuentas bancarias. Este plan no configura un nuevo medio de pago externo para los retiros manuales.
- Evitar doble uso del saldo en compras simultáneas o retiros; devolver saldo apartado cuando el pago se cancela, falla o vence, sin devoluciones duplicadas.

## 5. Comprobaciones y entrega

- Pruebas automáticas: bono al cobro pero no a la reserva, unicidad entre tienda/galletas, autorreferido, diez bonos = $50, propina por defecto $0 y 100% al repartidor, uso/retiro simultáneo, rechazo y cancelación, separación prueba/real.
- Revisar ES/EN y las pantallas modificadas en tamaños grande y pequeño.
- No hacer cobros ni retiros reales, no crear cuentas reales ni modificar o borrar usuarios/clientes.
- Las pruebas completas con sesión iniciada en Supabase externo requieren acceso de prueba autorizado; si no está disponible, reportarlas como pendientes, no como OK.
- Entregar tabla por punto: qué cambió, qué se comprobó y qué sigue pendiente. No publicar.

## Detalles técnicos

- Migración para datos de propina/ambiente en pedidos de galletas, trazabilidad de saldo y solicitudes, operaciones atómicas y permisos restringidos. No alterar datos de `auth.users` ni `clientes`; conservar datos históricos.
- Revisar y ampliar las rutas de captura, webhook firmado y entrega de galletas para persistir ambiente, recompensa y propina, conservando reserva, captura y transferencia actuales.
- Reutilizar `wallet_credits`, `referral_rewards` y `withdrawal_requests` con referencias explícitas al origen y al ambiente; mantener compatibilidad con afiliados antiguos.
- Cambios previstos: traducciones ES/EN y textos de envío; controles de propina compartidos; carrito de galletas y pantalla de tienda; funciones de compra/captura, bonos, saldo y pago a repartidores; webhook de pagos; cuenta e historial de retiros; pruebas y documentación. Más de tres archivos y una migración: todo queda pendiente de tu aprobación.
- Los cambios de permisos se aplican a la base compartida incluso sin publicar; los cambios de la web solo llegan al sitio publicado cuando publiques tú.