## Paso 4: Registro de negocios (multi-vendor)

Añade el módulo de negocios registrados (supermercados, tiendas, panaderías, farmacias) con catálogo y ofertas propias, integrado al sistema de roles y `has_role()` existente.

### 1. Migración SQL

Crear en `supabase/migrations/<timestamp>_businesses.sql`:

- **`businesses`**: `owner_user_id → auth.users`, `business_name`, `business_type` (enum check: supermercado/tienda/panaderia/farmacia/otro), email, phone, address, city, `status` (pendiente/aprobado/rechazado/suspendido), `rejection_reason`, `logo_url`, `approved_at`, `approved_by`, timestamps.
- **`business_products`**: `business_id` (FK cascade), name, description, category, price, stock_quantity, image_url, is_active, timestamps + trigger `update_updated_at_column`.
- **`business_offers`**: `business_id`, `product_id`, `discount_type` (porcentaje/monto_fijo), `discount_value`, `starts_at`, `ends_at`, `is_active`.

**Ajustes al SQL que pegaste** (obligatorios para este proyecto):

- `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated; GRANT ALL TO service_role; GRANT SELECT ON business_products, business_offers TO anon` (catálogo público) — tras cada `CREATE TABLE`, antes del `ENABLE RLS`.
- Reemplazar cualquier chequeo tipo `profiles.role = 'admin'` por `public.has_role(auth.uid(), 'admin'::app_role)` (el proyecto usa `user_roles` + `has_role`, no `profiles.role`).
- Añadir políticas admin: admins pueden ver/aprobar/rechazar cualquier `businesses` y auditar productos/ofertas.
- Añadir política pública anónima para `businesses` (SELECT donde `status = 'aprobado'`, solo columnas seguras vía vista o directamente — sin `email`/`phone` expuestos; se crea vista `public_businesses` con columnas seguras).
- Trigger `set_business_approved_at` que setea `approved_at`/`approved_by` cuando `status` pasa a `aprobado` (admin-only vía guard trigger, similar a `drivers_protect_admin_fields`).
- Guard trigger `businesses_protect_admin_fields` que impide al dueño cambiar `status`, `rejection_reason`, `approved_at`, `approved_by`.

### 2. Tipos + módulo cliente

- Regenerar `src/integrations/supabase/types.ts` (automático tras la migración).
- Crear `src/lib/businesses.ts` con helpers cliente:
  - `registerBusiness(payload)` — INSERT con `owner_user_id = auth.uid()`.
  - `fetchMyBusiness()` — el negocio del usuario logueado.
  - `fetchApprovedBusinesses({ type?, city? })` — lista pública para clientes.
  - `fetchBusinessProducts(businessId)`, `upsertProduct`, `deleteProduct`.
  - `fetchBusinessOffers(businessId)`, `upsertOffer`.

### 3. Server functions (admin)

Crear `src/lib/admin-businesses.functions.ts` con `requireSupabaseAuth` + check `has_role('admin')`:
- `listPendingBusinesses`, `approveBusiness(id)`, `rejectBusiness(id, reason)`, `suspendBusiness(id)`.

### 4. Rutas UI (sin lógica de checkout)

Nuevas rutas (solo scaffolding + formularios; sin tocar carrito/checkout de Hazorex):

- `src/routes/negocios.registro.tsx` — formulario público de postulación (requiere login).
- `src/routes/_authenticated/negocio.index.tsx` — panel del dueño (ver estado: pendiente/aprobado/rechazado; si aprobado, links a productos/ofertas).
- `src/routes/_authenticated/negocio.productos.tsx` — CRUD de productos del negocio propio.
- `src/routes/_authenticated/negocio.ofertas.tsx` — CRUD de ofertas.
- `src/routes/_authenticated/admin.negocios.tsx` — panel admin: aprobar/rechazar/suspender.
- `src/routes/negocios.tsx` — listado público de negocios aprobados por ciudad/tipo (opcional, se puede posponer).

Cada ruta con `head()` propio (title/description únicos), `errorComponent` y `notFoundComponent`.

### 5. Navegación

- Añadir link "Mi negocio" en `TopNav`/`BottomNav` cuando el usuario tenga un `businesses` propio.
- Link "Postula tu negocio" en el menú público.

### Detalles técnicos

- **RLS estilo Hazorex**: siempre `public.has_role(auth.uid(), 'admin'::app_role)` para admin; nunca `profiles.role`.
- **Storage**: bucket `business-logos` (público) para `logo_url` y `business-products` (público) para `image_url`. Se crea en la misma migración vía `insert into storage.buckets` si no existe.
- **Sin cambios** en catálogo Shopify, carrito, checkout, sorteo, ni módulo repartidor.

### Fuera de alcance (para pasos siguientes)

- Checkout multi-vendor / split cart por negocio.
- Rutas de repartidor recogiendo en negocios (integración con `delivery_routes`).
- Comisiones / payouts a negocios.
- Reviews de negocios.

¿Procedo con esta estructura, o quieres ajustar algo (ej. omitir ofertas por ahora, o incluir ya el listado público `/negocios`)?
