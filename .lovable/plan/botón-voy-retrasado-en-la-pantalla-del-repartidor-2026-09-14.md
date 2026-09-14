# Botón "Voy retrasado" en la pantalla del repartidor

## Qué verá el repartidor

En la parte baja de la pantalla de navegación, fijo sobre el borde inferior, un botón grande color ámbar: **"Voy retrasado"**. Al tocarlo se abre un panel con tres botones grandes, fáciles de tocar manejando:

- **+15 min**
- **+30 min**
- **+1 hora**

Al elegir uno, se confirma con un mensaje en pantalla: "Listo. Avisamos a 7 clientes. Nueva hora estimada de tu próxima parada: 6:35 PM." Si algo falla, aparece un aviso claro y no se cambia nada.

## Qué pasa por detrás

1. Se suma ese tiempo a la hora estimada de **todas las paradas pendientes** de la ruta del repartidor (las que están en "pendiente" o "en camino"). Las ya entregadas o fallidas no se tocan.
2. A cada cliente de esas paradas se le manda un aviso al celular:
   **"Vamos un poco retrasados. Nueva hora estimada: 6:35 PM."**
   (cada cliente recibe su propia hora nueva, no la de otro)
3. Todo queda registrado con la hora del cambio.

## Cambios en la base de datos (necesitan tu OK)

Una sola migración:

- Función segura `delay_route_stops(minutos)`: verifica que quien la llama sea el repartidor asignado a esa ruta, suma los minutos a la hora estimada de las paradas pendientes y devuelve la lista de clientes afectados con su nueva hora. Solo acepta 15, 30 o 60 minutos.
- Permiso de ejecución solo para usuarios autenticados.

No se crean ni se borran tablas. No se toca nada de clientes, pedidos ni pagos.

## Archivos de la aplicación

- `src/lib/eta.functions.ts` — se añade la acción "voy retrasado" (llama a la función de base de datos y luego manda los avisos).
- `src/routes/_authenticated/repartidor.pedido.$id.navegacion.tsx` — el botón grande abajo y el panel con las tres opciones.
- `src/routes/api/public/hooks/notify-delay.ts` (nuevo) — el envío de avisos al celular, reutilizando el mismo sistema que ya usa el aviso del sorteo.

## Detalles técnicos

- `delay_route_stops(p_minutes int)`: SECURITY DEFINER, `SET search_path = public`; resuelve la ruta activa del repartidor (`delivery_routes.driver_id = auth.uid()` y estado `en_transito`/`asignada`); `UPDATE route_stops SET eta = COALESCE(eta, now()) + (p_minutes || ' minutes')::interval, updated_at = now() WHERE route_id = ... AND status IN ('pendiente','en_camino')`; devuelve `TABLE(order_id uuid, cliente_id uuid, new_eta timestamptz)` haciendo join con `pedidos`. `REVOKE ... FROM anon, public; GRANT EXECUTE TO authenticated`.
- La función de servidor usa `requireSupabaseAuth` (RLS del propio repartidor) para el RPC, y el cliente admin solo para leer `push_subscriptions` de esos clientes y enviar el push con `@block65/webcrypto-web-push` y las claves VAPID existentes.
- Si `push_subscriptions` no existe en la base conectada, el cambio de horas se aplica igual y se informa que no se pudieron enviar avisos.
- Textos nuevos en español e inglés; el resto de idiomas queda con el inglés de respaldo.
