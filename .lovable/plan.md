# Sistema de notificaciones + Soporte Hazorex (chat) para productos no disponibles

## Objetivo
Cuando un producto de un pedido queda "no disponible" (agotado o marcado por admin), el cliente recibe una notificación tipo campanita y, al abrirla, entra a un chat simulado de Soporte Hazorex donde puede **aceptar un reemplazo** o **cancelar** ese ítem. Todo queda registrado y visible para el admin.

---

## 1. Base de datos (migración)

Nuevas tablas en `public`:

- **`order_item_issues`** — una fila por ítem de pedido marcado como no disponible.
  - Campos clave: `order_id`, `order_item_index` (o `product_id` + `variant`), `product_name`, `original_price`, `replacement_product_id`, `replacement_name`, `replacement_price`, `status` (`pending` | `replaced` | `cancelled` | `expired`), `resolved_at`, `created_by` (admin uid).
- **`support_conversations`** — un hilo por `order_item_issue`.
  - Campos: `issue_id`, `user_id`, `status` (`open` | `closed`), `last_message_at`.
- **`support_messages`** — mensajes del chat.
  - Campos: `conversation_id`, `sender` (`support` | `customer` | `system`), `body`, `action` (nullable: `accept_replacement` | `cancel_item`), `created_at`.
- **`customer_notifications`** — bandeja del cliente (base para el contador de la campanita).
  - Campos: `user_id`, `type` (`item_unavailable`), `issue_id`, `title`, `body`, `read_at`, `created_at`.

Reglas:
- RLS: cliente solo ve sus propias filas (`auth.uid() = user_id`). Admin ve todo vía `has_role(auth.uid(),'admin')`.
- GRANTs a `authenticated` y `service_role` en cada tabla.
- Realtime habilitado en `customer_notifications` y `support_messages` para actualización en vivo.
- Trigger: al insertar en `order_item_issues` se crean automáticamente la conversación, el primer mensaje del "soporte" y la notificación del cliente.

## 2. Server functions (TanStack `createServerFn`)

En `src/lib/support.functions.ts`:
- `listMyNotifications` / `markNotificationRead` / `getUnreadCount`.
- `getConversation({ issueId })` — devuelve issue + mensajes + producto de reemplazo sugerido.
- `acceptReplacement({ issueId })` — actualiza el ítem del pedido al reemplazo, marca issue `replaced`, agrega mensajes de sistema, ajusta total del pedido.
- `cancelItem({ issueId })` — quita el ítem, recalcula total, si queda vacío marca el pedido `cancelled`, marca issue `cancelled`.
- `sendCustomerMessage({ issueId, body })` — mensaje libre del cliente (queda como registro).

En `src/lib/admin-support.functions.ts` (protegidas por `has_role admin`):
- `markProductUnavailable({ orderId, itemIndex, replacementProductId? })` — crea el `order_item_issue` (dispara trigger).
- `listIssues({ status? })` — para el panel admin.

## 3. Frontend cliente

- **Campanita** en `TopNav`: badge con `unread_count`, suscripción realtime a `customer_notifications`. Reutilizar patrón de `NotificationsSheet.tsx` pero con datos reales.
- **`SupportChatSheet`** nuevo componente (Sheet lateral en desktop, full-screen en mobile):
  - Header con logo Hazorex + "Soporte Hazorex" + estado "en línea".
  - Burbujas con timestamps, avatar de marca en mensajes de soporte, alineación derecha para cliente.
  - Mensaje inicial automático del sistema con el nombre del producto y `#orderId`.
  - Card del **producto de reemplazo** (imagen, nombre, precio nuevo vs original).
  - Dos botones destacados: **"Aceptar reemplazo"** y **"Cancelar pedido"**. Cancelar pide confirmación en un segundo mensaje del chat.
  - Después de decidir: burbuja de confirmación, botones deshabilitados, estado "resuelto".
  - Input de texto para mensajes libres (opcional, se guarda).
  - Realtime en `support_messages`.

## 4. Panel admin

Nueva ruta `src/routes/admin.support.tsx`:
- Lista de `order_item_issues` con filtro por estado.
- Detalle del hilo (mismos mensajes que ve el cliente, solo lectura).
- En la vista de detalle de pedido (o desde una acción rápida en `admin.shipping` / historial admin): botón **"Marcar producto como no disponible"** que abre un modal para elegir producto de reemplazo del catálogo → dispara `markProductUnavailable`.

## 5. Diseño

- Coherente con la marca (fondo `#eaeded`, acento ámbar, texto `#1a0f0a`), avatar circular con `HazorexLogo`, tipografía y radios consistentes con el resto.
- Todo el flujo es en vivo (realtime), sin recargar página.
- i18n: textos añadidos a los 9 locales existentes (español como base, resto con la clave en español si aplica).

---

## Detalles técnicos
- Migración única con las 4 tablas + triggers + RLS + GRANTs + `alter publication supabase_realtime add table ...`.
- `order_item_issues.replacement_product_id` referencia catálogo Shopify por handle/id (guardamos snapshot de nombre/precio para historial).
- Cancelación: por defecto cancela **solo ese ítem**; si es el último, cancela el pedido completo (definido, no configurable por ahora).
- No se toca el flujo de pago ya cobrado: si el pedido está pagado y se cancela un ítem, se registra `refund_pending` en el pedido para que el admin procese el reembolso manualmente (fuera de alcance de este cambio automatizar Stripe refund).

## Fuera de alcance
- Envío automático de email (se puede agregar después usando el sistema de emails existente).
- Refund automático en Stripe.
- Chat con agente humano real.
