
# Batching + Optimización de rutas con Google Maps

Usar el conector **Google Maps Platform** para agrupar pedidos cercanos automáticamente y calcular la ruta óptima (multi-stop) usando la Routes API. Esto reemplaza el batching manual (Haversine puro) con optimización real de Google.

## 1. Conectar Google Maps Platform

Vincular el connector `google_maps` al proyecto vía `standard_connectors--connect`. Esto inyecta:
- `GOOGLE_MAPS_API_KEY` (server, para el gateway)
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (browser, para mapas)
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`

## 2. Server functions — `src/lib/batching.functions.ts`

Tres funciones protegidas con `requireSupabaseAuth`:

- **`suggestBatch({ orderId })`** — Devuelve pedidos candidatos para agrupar con el pedido dado:
  - Filtra `courier_orders` con estado `pendiente` o `asignado`, sin `batch_id`, dentro de un radio de ~1.5 km del pickup (Haversine inicial para reducir candidatos).
  - Llama a **Routes API** (`/routes/directions/v2:computeRoutes`) con waypoints intermedios y `optimizeWaypointOrder: true` para obtener orden óptimo, distancia total y duración.
  - Devuelve orden sugerido + tiempo estimado + ahorro vs entregas separadas.

- **`createBatch({ orderIds })`** — Confirma el agrupamiento:
  - Genera `batch_id` (uuid), asigna a los pedidos con `batch_position` según el orden optimizado.
  - Solo permitido si el driver ya está asignado a todos los pedidos (o ninguno).

- **`getOptimizedRoute({ batchId | orderId })`** — Para el repartidor en ruta:
  - Recolecta todos los stops (`courier_order_stops`) del batch.
  - Llama a Routes API con `travelMode: DRIVE`, `origin` = ubicación actual del driver, `intermediates` = pickups + dropoffs restantes, `optimizeWaypointOrder: true`.
  - Devuelve polyline codificada, orden de stops, ETA por parada.

Todas las llamadas a Google pasan por el gateway (`https://connector-gateway.lovable.dev/google_maps/routes/...`) con `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $GOOGLE_MAPS_API_KEY`.

## 3. UI Repartidor — nueva sección "Batching"

En `/repartidor/index.tsx`, cuando hay >1 pedido pendiente cercano:
- Card "🎯 Agrupa entregas cercanas" con botón "Ver sugerencia".
- Dialog con lista de pedidos sugeridos, distancia total, tiempo estimado, ahorro (%). Botón "Aceptar batch" llama a `createBatch`.

En `/repartidor/pedido/$id/navegacion.tsx`:
- Si el pedido tiene `batch_id`, mostrar barra superior "Batch de N entregas — Parada X de Y".
- Botón "Ver ruta completa" abre un mapa con la ruta optimizada.

## 4. Mapa real en navegación y tracking

Reemplazar el placeholder OpenStreetMap actual por **Google Maps JS API** (browser key):
- Componente `<GoogleMapView>` en `src/components/courier/GoogleMapView.tsx`.
- Carga async con `callback=initMap`, `channel=VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`.
- Renderiza polyline decodificada de la Routes API + markers para cada stop (pickup/dropoff) + marker del driver.
- Usado en:
  - `/repartidor/pedido/$id/navegacion.tsx` (vista del repartidor)
  - `/pedido/$id/seguimiento.tsx` (vista del cliente — solo driver + destino)

## 5. Migración de DB

Solo un ajuste menor:
- Índice en `courier_orders(status, batch_id, pickup_lat, pickup_lng)` para acelerar búsqueda de candidatos.
- Función RPC `nearby_batchable_orders(_order_id uuid, _radius_km numeric)` que devuelve candidatos usando earthdistance (o cálculo Haversine en SQL) para evitar traer todos los pedidos al server.

## Detalles técnicos

- **Costos**: Routes API con optimización de waypoints cuesta más ($10/1000 llamadas vs $5). Cachear resultado de `suggestBatch` por 60s en memoria del handler.
- **Límite de waypoints**: Routes API acepta hasta 25 intermediates — batch máximo de 5 pedidos (2 stops c/u = 10 intermediates + origen).
- **Fallback**: si el gateway falla, `getOptimizedRoute` devuelve el orden secuencial actual sin polyline, y la UI muestra ruta línea recta.
- **Prohibited territories**: Google Maps no funciona en ciertos países (Cuba, Irán, etc.). Detectar error y mostrar mensaje al admin.

## Archivos a crear/editar

**Nuevos:**
- `src/lib/batching.functions.ts`
- `src/components/courier/GoogleMapView.tsx`
- `src/components/courier/BatchSuggestionDialog.tsx`
- `supabase/migrations/…_batching_indexes.sql`

**Editados:**
- `src/routes/_authenticated/repartidor.index.tsx` (card de sugerencia)
- `src/routes/_authenticated/repartidor.pedido.$id.navegacion.tsx` (mapa Google + barra batch)
- `src/routes/_authenticated/pedido.$id.seguimiento.tsx` (mapa Google)

## Antes de implementar

Necesito que confirmes conectar **Google Maps Platform** al proyecto (te lo pediré con el diálogo del connector al arrancar la implementación). Sin el connector vinculado, la Routes API no responde.
