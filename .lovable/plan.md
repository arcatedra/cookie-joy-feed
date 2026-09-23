# Zonas por código postal, menú del admin y pago diario dentro de Supabase

## 1. Zonas por código postal
- Nueva sección **"Zonas de entrega"** en /admin/precios: crear, editar o borrar zonas. Cada zona tiene: nombre, lista de códigos postales (se pegan separados por coma o espacio) y sus días de ruta (lunes a domingo).
- Un mismo código postal no puede estar en dos zonas (se avisa al guardar).
- **Repartidor**: en el formulario de /repartidores y en su panel elige **una o varias zonas** (casillas). Se quita "Otra zona".
- **Pedidos disponibles**: el repartidor solo ve pedidos cuyo código postal esté en alguna de sus zonas (se mantienen las reglas de día de ruta y de más de 45 lb solo en auto).
- **Código postal sin zona**: el pedido no le aparece a ningún repartidor; en /admin/pedidos-tienda sale marcado "Sin zona — asignar a mano".
- **Días de entrega del cliente**: en la tienda, el selector de fecha usa los días de ruta de la zona de su código postal (sigue respetando la hora límite). Si su código postal no tiene zona, se usan los días generales actuales (lunes, miércoles, viernes).
- Los repartidores que ya tenían una zona escrita quedan sin zona hasta que elijan (hoy no hay repartidores, así que no afecta a nadie).

## 2. Menú del admin
En el panel de administrador (donde hoy están los enlaces de admin en "Perfil") se agregan: **Pedidos de tienda**, **Transferencias**, **Precios y zonas**, **Negocios** y **Repartidores**, con contador de pendientes:
- Pedidos de tienda: listos sin repartidor (incluye los sin zona).
- Transferencias: pendientes + fallidas.
- Negocios: solicitudes por aprobar.
- Repartidores: postulaciones por revisar.

## 3. Pago diario sin servicios externos
- Se programa dentro de Supabase: todos los días a las **6:00 am hora de Nueva York**, ajustado solo al horario de verano (internamente revisa a las 10:00 y 11:00 UTC y solo actúa la que cae a las 6 am en Nueva York; 2 revisiones al día, costo mínimo).
- Hace la llamada a la ruta de pagos con la clave secreta guardada en la **bóveda segura de Supabase (Vault)**. La clave se genera ahí mismo, nunca queda escrita en el código ni tienes que copiarla.
- **Si falla** (la web no responde, error, clave incorrecta), queda una fila "Falló" con el motivo en el **Historial de pagos automáticos**. Se revisa en la siguiente pasada del mismo día.
- Se deja de necesitar cron-job.org. Sigue en modo prueba de Stripe.

## Lo que no se toca
Checkout de galletas, cobro al cliente, tabla de usuarios/clientes. No se publica.

## Detalles técnicos
- **Migración**:
  - `delivery_zones` (name único, zip_codes text[], route_days int[] 0-6, activo) con GRANT, RLS: lectura pública (la tienda la necesita para días), escritura solo admin; trigger que valida zips únicos entre zonas.
  - `driver_zones` (driver_id → drivers, zone_id → delivery_zones, PK compuesta), RLS: el repartidor gestiona las suyas, admin todo.
  - `claim_store_order`: reemplaza la comparación por ciudad por "zip del pedido ∈ zonas del repartidor".
  - `payout_runs`: columnas `status` ('ok'|'fallido'|'enviado'), `request_id bigint`.
  - Extensiones `pg_cron` y `pg_net`; secreto `payout_run_secret` creado en `vault` con `gen_random_bytes`.
  - Función `verify_payout_secret(text)` SECURITY DEFINER, EXECUTE solo `service_role`.
  - Función `trigger_daily_payout()` SECURITY DEFINER: si la hora de `America/New_York` es 6 y no hubo corrida hoy, `net.http_post` a `https://hazorex.com/api/public/payout-run` y guarda `request_id` en `payout_runs` (status 'enviado'); además reconcilia respuestas de `net._http_response` no 200 o vencidas → status 'fallido' con el error. Cron `0 10,11 * * *`.
- **Código**:
  - `payout-run.ts`: acepta el header si coincide con `PAYOUT_RUN_SECRET` o con el de Vault (vía `verify_payout_secret`); marca la fila 'enviado' como 'ok'.
  - `store-delivery.functions.ts`: filtro por zip/zonas; admin ve "sin zona".
  - `pricing.functions.ts` + `admin.precios.tsx`: CRUD de zonas; `tienda.$slug.tsx` y `pricing.ts`: días por zona del zip.
  - `repartidores.tsx`, `repartidor.index.tsx` (o panel): selector múltiple de zonas; `nyc-zones.ts` queda sin uso en repartidores.
  - `profile.tsx`: menú admin con contadores (nuevo `adminPendingCounts` server fn).
  - `admin.transferencias.tsx`: muestra estado 'fallido'/'enviado'.
  - Traducciones es/en.
