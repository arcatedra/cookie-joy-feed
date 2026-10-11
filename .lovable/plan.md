# Pantalla "Pedidos de galletas" en el admin

Necesita aprobación porque toca más de 3 archivos, agrega una tabla nueva y usa reembolsos de Stripe.

## Qué vas a ver
- Nueva página **/admin/pedidos-galletas**, con el mismo estilo que "Pedidos de tienda".
- **Contadores arriba:** pedidos de hoy, pedidos por preparar y total cobrado hoy (hora de Nueva York).
- **Filtros:** estado (Pagado, En preparación, Listo, En camino, Entregado, Cancelado, Pendiente de pago) y día de entrega.
- **Cada pedido muestra:** número, fecha, cliente (nombre, teléfono, correo), dirección completa, día de entrega, galletas y cantidades, subtotal, entrega, propina, total y estado. Los más nuevos salen primero.
- **Botones según el estado:**
  - Pagado → "Marcar en preparación"
  - En preparación → "Marcar listo"
  - Listo o En camino → "Marcar entregado"
  - "Cancelar": si el pedido está pendiente de pago, cierra la ventana de pago de Stripe sin cobrar nada.
  - "Reembolsar": pide confirmación, solo funciona con pedidos cobrados y devuelve el total por Stripe. El pedido queda como Reembolsado y no se puede reembolsar dos veces.
- **Lista de preparación:** botón "Lista para hornear". Muestra el total de cada galleta para el día de entrega elegido y se puede imprimir.
- **Historial:** cada cambio guarda quién lo hizo y cuándo, y se ve debajo del pedido.
- **Aviso al cliente:** cada cambio de estado le manda un aviso al celular con el sistema que ya existe. Si no hay plantilla de correo para ese estado, no se manda correo y no se inventa ninguna.
- Enlace "Pedidos de galletas" en el menú del admin en /profile, junto a "Pedidos de tienda".

## Reglas
- Solo los administradores pueden abrir y usar la página. El servidor lo revisa en cada acción.
- No se cambian ni se borran datos de usuarios o clientes. Los datos del cliente solo se leen.
- El checkout de galletas no cambia.
- En la vista previa todo va en modo prueba de Stripe. No se hacen cobros reales.
- No se publica nada.

## Detalles técnicos
- Migración aditiva: tabla `pedido_status_events` (pedido_id, from_estado, to_estado, actor_id, nota, created_at) con GRANT, RLS y lectura solo para admin. No se tocan las columnas existentes de `pedidos`.
- Día de entrega: se calcula con la misma regla de lunes, miércoles y viernes ("pide el día antes") a partir de `creado_en`, porque `pedidos` no tiene esa columna.
- Nuevo `src/lib/admin-cookie-orders.functions.ts` con `requireSupabaseAuth` + `has_role` admin. Funciones: listar, cambiar estado (con transiciones válidas), cancelar (expira la sesión con `stripePost`) y reembolsar (`/v1/refunds` con Idempotency-Key `refund-cookie-<id>`, ambiente tomado de `stripe_environment` y bloqueado si ya está reembolsado). Las escrituras se hacen con el cliente admin solo después de verificar el rol. Al cancelar o reembolsar se libera el crédito usado con `releaseOrderCredit`, como ya se hace en otras partes.
- Nuevo `src/routes/_authenticated/admin.pedidos-galletas.tsx`. También se editan `src/routes/profile.tsx` y `src/lib/push` (o el helper de avisos que ya existe) para el aviso al cliente.
- Pruebas: build, cambios de estado inválidos rechazados y reembolso duplicado bloqueado (prueba unitaria de las reglas de transición).
