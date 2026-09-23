# Repartidor para pedidos de tienda + pago automático diario

## 1. Flujo del repartidor

**Qué verá cada quien**
- **Repartidor** (panel, nueva sección "Pedidos de tienda"): los pedidos que ya están en "Listo para recoger", agrupados por código postal. Cada tarjeta muestra el nombre y la dirección de la tienda, la zona, el peso, cuántos artículos lleva y cuánto va a ganar (su parte del envío + el cargo por peso + la propina). Botón **"Tomar pedido"**.
- Solo aparecen pedidos de **su zona** y de un **día de ruta** (el del pedido: hoy o atrasado). Los de **más de 45 lb** solo se muestran a repartidores con **auto**. Solo los ven repartidores **aprobados**.
- Si dos repartidores tocan "Tomar" a la vez, solo uno se lo queda; el otro ve "Este pedido ya lo tomó otro repartidor".
- **Pasos**: Tomado → Recogido en tienda → En camino → Entregado. Para "Entregado" es **obligatorio subir una foto**.
- Al marcar "Entregado": se crea su pago y se intenta transferir por Stripe Connect en ese momento; si aún no conectó su cuenta, queda "pendiente" y se paga solo cuando la conecte.
- **Cliente**: en su pedido ve el paso actual y el **nombre del repartidor** (sin teléfono). Puede ver la foto de entrega.
- **Tienda**: en su lista de pedidos ve **quién lo recogió** y el paso actual. Ya no marca ella "Entregado" (lo hace el repartidor).
- **Admin**: en una nueva página "Pedidos de tienda" puede **asignar o reasignar** un pedido a cualquier repartidor aprobado (mientras no esté entregado).

**Bono de referido** se sigue dando al entregar, igual que hoy.

## 2. Pago automático diario

- La ruta de pagos que ya existe (transfiere a los súpers y reintenta lo pendiente o fallido de súpers y repartidores) se llamará **una vez al día** (propongo 6:00 am hora de Nueva York).
- Cada ejecución queda registrada: fecha, cuántas transferencias salieron, total pagado, cuántas quedaron pendientes y los errores. Se verá en una nueva sección "Historial de pagos automáticos" dentro de la página de Transferencias del admin, con botón **"Ejecutar ahora"**.
- **Cómo se programa**: la tarea diaria de Supabase no puede hacer las transferencias por sí sola (necesitan llamar a Stripe desde la web), así que se programa con un **servicio de tareas programadas externo y gratuito** (por ejemplo cron-job.org) que llama una vez al día a la ruta de pagos con la clave secreta. Te dejo los pasos exactos (3 minutos) al terminar; es lo único que necesitaré que hagas tú.

Todo sigue en **modo prueba** de Stripe.

## Lo que no se toca
Checkout de galletas, cobro al cliente, tabla de usuarios/clientes. No se publica.

## Detalles técnicos
- **Migración**:
  - `store_orders`: `estado_entrega` (`disponible|tomado|recogido|en_camino|entregado`), `tomado_en`, `recogido_en`, `en_camino_en`, `entregado_en`, `foto_entrega_url`, `repartidor_nombre` (copia para mostrar sin exponer la tabla drivers).
  - Función `claim_store_order(p_order_id)` SECURITY DEFINER: verifica repartidor aprobado, zona, vehículo si >45 lb, y hace `UPDATE ... WHERE repartidor_id IS NULL AND estado='listo'` (bloqueo atómico). EXECUTE solo a `authenticated`.
  - Función `advance_store_delivery(p_order_id, p_step, p_photo)` que solo permite pasos en orden y solo al repartidor asignado; "entregado" exige foto y pasa `estado` a `entregado`.
  - Tabla `payout_runs` (ran_at, source 'cron'|'manual', transfers_ok, total_usd, pending, errors jsonb) con GRANT a service_role y lectura solo admin por RLS.
  - Bucket privado `delivery-photos` con RLS por carpeta del repartidor; lectura por URL firmada desde el servidor.
- **Código**:
  - `src/lib/store-delivery.functions.ts`: listAvailableStoreOrders, claimStoreOrder, advanceStoreDelivery (al entregar llama `grantReferralRewardForOrder`, `registerDriverPayoutForOrder` y `transferDriverPayout`), adminAssignStoreOrder.
  - Rutas nuevas: `repartidor.tienda.tsx`, `admin.pedidos-tienda.tsx`; enlace en DriverLayout.
  - Ajustes: `negocios.pedidos.tsx` (quién lo recogió, sin botón Entregado), `mis-pedidos.tienda.$id.tsx` (paso + nombre + foto), `store-orders.functions.ts` (markOrderDelivered queda solo para admin).
  - `payout-run.ts`: registra cada ejecución en `payout_runs`, suma totales y errores; `admin-transfers.functions.ts` + `admin.transferencias.tsx`: historial y "Ejecutar ahora".
  - Traducciones es/en (resto de idiomas con respaldo en inglés).
