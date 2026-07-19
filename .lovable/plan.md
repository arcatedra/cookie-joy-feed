# Plan: HAZOREX conectado a Supabase real

## Estado que encontré
- Las 5 tablas ya existen con las columnas correctas y RLS bien puesta (cada cliente solo ve/edita lo suyo; productos es lectura pública). No las voy a tocar.
- `pedidos.numero_pedido` ya se autogenera con el formato `HZX-XXXXXXXX`.
- `productos` está vacía — hay que cargarla.
- No hay trigger que cree la fila en `clientes` al registrarse un usuario.
- El catálogo actual (galletas + reels) está hardcodeado en el código.

## Lo que voy a hacer

### 1. Migración de base de datos (1 sola migración)
- Trigger en `auth.users` que, al confirmarse un usuario nuevo, inserta su fila en `clientes` con el mismo `id`, su `email`, y `nombre_completo` desde `raw_user_meta_data.name` (o el email como fallback).
- Backfill: crear la fila de `clientes` para cualquier usuario que ya exista y no la tenga.
- Semilla de la tabla `productos` con el catálogo actual (galletas del menú) usando UUIDs estables para que los pedidos históricos siempre encuentren el producto.
- Función `crear_pedido_con_items(p_items jsonb, p_direccion jsonb, p_subtotal, p_envio, p_impuestos, p_total, p_stripe_pi text)` con `SECURITY DEFINER` que valida `auth.uid()`, inserta el `pedido` + todos los `pedido_items` en una sola transacción y devuelve el número de pedido. Esto evita pedidos parciales si falla a la mitad.
- Ampliar `suscripciones.estado` para aceptar los estados que manda Stripe (activa/cancelada/pausada/vencida) y agregar índice por `stripe_subscription_id`.

### 2. Auto-alta y perfil del cliente
- Nuevo server-fn `getMyCliente` / `upsertMyCliente` (con `requireSupabaseAuth`) para leer y actualizar el perfil.
- Nueva ruta protegida `/mi-cuenta` con formulario para: nombre completo, teléfono, dirección línea 1/2, ciudad, estado, código postal, país. Solo el dueño lo ve.
- Enlace a "Mi cuenta" desde el menú de usuario en `TopNav`.

### 3. Catálogo unificado
- Server-fn público `listProductos()` que lee `productos` con `disponible=true`.
- `/shop`, `/menu`, `/best-sellers`, `/build-pack`, `/search` y el carrusel de Reels leen de esa fuente. Se elimina la lista hardcodeada y se sustituye por hooks/consultas.
- El mapa i18n de nombres se mantiene: cada producto en la tabla lleva su `nombre` en español (base) y el frontend sigue traduciendo por `id → clave i18n` como ya funciona, así no rompe idiomas.

### 4. Checkout → pedido real
- En el webhook de Stripe (`/api/public/payments/webhook`), al evento `checkout.session.completed` en modo `payment`:
  - Leer los items desde `session.metadata` (los guardo al crear la sesión: `cliente_id`, JSON con `[{producto_id, nombre, precio, cantidad}]`, dirección de envío, subtotal, envío, impuestos, total).
  - Llamar a `crear_pedido_con_items(...)` con `SECURITY DEFINER` usando el `service_role` (RLS del cliente no aplica, pero la función valida el `cliente_id` contra la metadata firmada por Stripe).
  - Guardar `stripe_payment_intent_id`.
- En `cart-checkout.functions.ts`: al crear la Checkout Session incluyo esos metadatos y la dirección.

### 5. "Mis Pedidos"
- Nueva ruta `/mis-pedidos` (protegida) que lee `pedidos` + `pedido_items` por RLS del propio usuario.
- Lista ordenada por `creado_en desc`: número de pedido, fecha, estado con badge de color, total.
- Al expandir: items con nombre, cantidad, precio unitario y subtotal, más la dirección de envío guardada en `direccion_envio` (jsonb).
- Diseño limpio con las clases y tokens ya definidos en `styles.css`, sin cambiar el look global.

### 6. Suscripción conectada
- Refactor del webhook para eventos `customer.subscription.created/updated/deleted`:
  - Traducir el `status` de Stripe → `estado` de tu tabla (`active/trialing → activa`, `canceled → cancelada`, `paused → pausada`, `past_due/unpaid → vencida`).
  - Upsert por `stripe_subscription_id`, escribiendo `cliente_id`, `plan`, `precio`, `fecha_inicio`, `fecha_renovacion`, y `fecha_cancelacion` cuando aplique.
- En `/mi-cuenta`: bloque "Mi suscripción" mostrando estado actual y desde cuándo, con botón para abrir el Stripe Billing Portal (cancelar/actualizar tarjeta).

### 7. i18n
- Agrego las claves nuevas (`myAccount.*`, `myOrders.*`) a los 9 idiomas usando el script `scripts/translate-new-keys.ts` que ya existe.
- Ningún texto en JSX queda hardcodeado.

### 8. Pruebas
- Playwright headless local: registro de usuario nuevo → confirmar que aparece la fila en `clientes` → guardar dirección en `/mi-cuenta` → agregar producto al carrito → checkout con la tarjeta de prueba `4242 4242 4242 4242` (te aviso si necesito que actives Stripe payments; ya usás gateway sandbox) → confirmar que llega el pedido a `/mis-pedidos` con sus items.
- Verificación SQL directa de que las filas quedan bien y RLS bloquea a otros usuarios.

## Fuera de alcance (no lo toco)
- Diseño visual global, i18n de páginas ya funcionando, políticas RLS existentes, panel admin, sorteo diario, referrals, ruleta.

## Nota sobre Stripe
El proyecto ya tiene la integración de pagos configurada en sandbox (`STRIPE_SANDBOX_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`). Uso esa. Si al probar detecto que falta la clave live o algo, te aviso — no toco nada de credenciales sin confirmarte.

## Orden de ejecución
1. Migración (trigger + backfill + semilla productos + función `crear_pedido_con_items`).
2. Server functions (`clientes`, `productos`, `pedidos`, `suscripciones`).
3. Refactor de catálogo (`/shop`, `/menu`, reels).
4. Nueva página `/mi-cuenta`.
5. Nueva página `/mis-pedidos`.
6. Webhook de Stripe (pedidos + suscripciones).
7. i18n en 9 idiomas.
8. Pruebas end-to-end.

¿Le doy?
