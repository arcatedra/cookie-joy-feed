# Etapa 3 — Flujo de navegación del repartidor tras aceptar un pedido

## Contexto y dependencias

Antes de construir este flujo hace falta la **base de pedidos** que hoy no existe:

- No hay tabla `orders` de repartidores (la actual `orders` es de la tienda / galletas, no compatible).
- No hay `order_stops` ni asignación `driver_id`.
- No hay lista de "pedidos disponibles" ni pantalla de aceptación.
- No hay integración de mapas embebida (Mapbox/Google Maps JS) todavía en el proyecto.

Este prompt asume que un pedido llega asignado a un `driver_id`. Voy a construir esa base mínima como parte de la etapa, porque sin eso la pantalla de navegación no tiene de dónde leer.

## Alcance de esta etapa

Todo bajo la ruta protegida `/_authenticated/repartidor/*`, visible solo para usuarios con rol `repartidor` aprobado (`drivers.application_status = 'aprobado'`).

### 1. Backend — modelo de datos (migración única)

- `courier_orders` (renombro para no chocar con la `orders` de la tienda):
  - `id`, `driver_id` (fk `drivers`, nullable), `status` enum (`disponible`, `aceptado`, `en_recoleccion`, `en_camino_entrega`, `completado`, `cancelado`)
  - `pickup_address`, `pickup_lat`, `pickup_lng`, `pickup_contact_name`, `pickup_notes`
  - `estimated_earnings numeric`, `estimated_duration_minutes int`
  - `accepted_at`, `picked_up_at`, `completed_at`
  - `created_at`, `updated_at` + trigger
- `courier_order_stops`:
  - `id`, `order_id` fk, `sequence_number int`
  - `delivery_address`, `delivery_lat`, `delivery_lng`, `recipient_name`, `recipient_phone`
  - `status` enum (`pendiente`, `en_camino`, `entregado`, `fallido`)
  - `proof_type` enum (`foto`, `firma`, `codigo`, `ninguno`), `proof_url`, `failure_reason`, `delivered_at`
- Bucket privado `delivery-proofs` con RLS: el repartidor solo escribe/lee objetos de sus propios stops.
- RLS en ambas tablas: repartidor aprobado ve/actualiza solo filas con su `driver_id`; admin ve todo.
- Columna `preferred_gps_app text` en `drivers` (`google` | `waze` | `apple` | null).
- GRANTs `authenticated` + `service_role` en ambas tablas.

### 2. Server functions (`createServerFn` con `requireSupabaseAuth`)

- `listAvailableOrders` — pedidos `disponible` sin driver.
- `acceptOrder(orderId)` — asigna `driver_id`, `status='aceptado'`, `accepted_at=now()`. Bloquea si el repartidor ya tiene un pedido en curso.
- `startOrder(orderId)` → `status='en_recoleccion'`.
- `confirmPickup(orderId, { code? })` → `picked_up_at`, `status='en_camino_entrega'`.
- `confirmDelivery(stopId, { proofUrl?, code? })` → marca stop `entregado`; si es el último, cierra pedido.
- `failStop(stopId, reason)` → stop `fallido`, avanza.
- `cancelOrder(orderId, reason)`.
- `getActiveOrder()` — devuelve el pedido en curso del repartidor (para redirect al reabrir).
- `setPreferredGpsApp(app)`.

### 3. UI — rutas nuevas

Todas bajo `src/routes/_authenticated/repartidor.*.tsx`:

- `repartidor.index.tsx` — lista de pedidos disponibles + card destacada si hay un pedido en curso (redirige auto).
- `repartidor.pedido.$id.resumen.tsx` — resumen post-aceptación, botón único **Comenzar**.
- `repartidor.pedido.$id.navegacion.tsx` — **pantalla central**:
  - Mapa (Google Maps JS API vía connector `google_maps` ya disponible, con `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`) a pantalla completa con pin del repartidor (geolocation) y pin de la parada activa.
  - Bottom sheet fijo con: indicador ("Recolección" / "Entrega X de N"), dirección, distancia/tiempo estimado (Routes API vía gateway), contacto + notas.
  - Botón **Abrir ruta** → selector de app GPS (Google/Waze/Apple según SO), memoriza preferencia.
  - Botones **Llamar** / **Mensaje** con `tel:` y `sms:`/WhatsApp.
  - Botón de estado ("Llegué al punto de recolección" / "Llegué a la dirección"), abre panel de confirmación.
  - **Reportar un problema** discreto.
  - Máquina de estados basada en `courier_orders.status` + primera stop `pendiente`. Transición entre stops con fade.
- `repartidor.pedido.$id.completado.tsx` — resumen final, botón **Buscar nuevo pedido**.

### 4. Confirmación de parada

Modal / expansión del bottom sheet:

- **Recolección**: checklist + input opcional para código.
- **Entrega**:
  - `foto` → `<input type="file" accept="image/*" capture="environment">`, sube a `delivery-proofs`.
  - `firma` → canvas táctil (react-signature-canvas o implementación mínima con pointer events), exporta PNG y sube.
  - `codigo` → input numérico.
  - `ninguno` → botón confirmar.

### 5. Excepciones

Sheet "Reportar un problema" con: no encuentro dirección, cliente no responde (doble confirmación → `fallido`), cancelado en sitio (→ `cancelado`).

### 6. Persistencia

- Al montar `_authenticated` de `/repartidor`, un loader llama `getActiveOrder`; si hay pedido en curso, redirige a `.../navegacion`.
- Toda pantalla lee estado desde el servidor vía TanStack Query; nada crítico en local state.
- `localStorage` solo para preferencia de GPS.

### 7. Estilo

- Botones ≥ 48px, texto ≥ 16px, alto contraste.
- Colores de estado: verde (confirmado), ámbar (en curso), rojo (fallido).
- Mapa ~65% de la altura, bottom sheet ~35% (expande al confirmar).

## Datos de prueba

Como no existe todavía flujo de creación de pedidos por parte de comercios/admin, incluyo un pequeño **seed manual** (via `supabase--insert` cuando esté aprobado): 2 pedidos `disponible` con 1 y 2 stops respectivamente, con coordenadas de tu ciudad, para poder probar el flujo end-to-end.

## Fuera de alcance (para prompts posteriores)

- Optimización automática del `sequence_number` (Routes API `computeRouteMatrix`).
- Panel de admin / comercio para crear pedidos.
- Pagos a repartidores (Stripe Connect).
- Push notifications de nuevos pedidos.
- Chat en vivo repartidor ↔ cliente.

## Detalles técnicos

- **Mapas**: uso el connector `google_maps` ya conectado. Script cargado con `loading=async` + callback global, `google.maps.Marker` (no `AdvancedMarkerElement`), sin `mapId`. Routes API (`routes/directions/v2:computeRoutes`) vía gateway desde una server function para distancia/tiempo — nunca desde el browser con la key server.
- **Geolocalización**: `navigator.geolocation.watchPosition` con fallback si el usuario deniega (usa dirección de pickup como centro).
- **Deep links GPS**: helpers puros en `src/lib/gps-deeplinks.ts`, detección `iOS`/`Android` por `navigator.userAgent`.
- **Storage**: bucket `delivery-proofs` privado, path `{driver_id}/{stop_id}/{timestamp}.jpg`.
- **RLS**: policies con `has_role(auth.uid(), 'repartidor')` + `driver_id = auth.uid()`.

```text
/_authenticated/repartidor
  ├─ /                          lista disponibles + redirect si activo
  ├─ /pedido/$id/resumen        Comenzar
  ├─ /pedido/$id/navegacion     mapa + bottom sheet (loop de stops)
  └─ /pedido/$id/completado     resumen + volver
```

## ¿Confirmas?

Este es un módulo grande. Si querés, lo puedo trocear aún más y hacer solo:

- **3a**: modelo de datos + server functions + seed + lista de pedidos disponibles + aceptar + resumen.
- **3b**: pantalla de navegación con mapa + deep links GPS.
- **3c**: confirmación con pruebas (foto/firma/código) + excepciones + pantalla de cierre + persistencia.

Decime si prefieres 3a / 3b / 3c por separado o todo de una.
