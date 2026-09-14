# Botón "Reportar un problema" en el seguimiento del cliente

## Qué verá el cliente

En la pantalla de seguimiento del pedido, debajo de los datos de la entrega, aparece un botón grande **"Reportar un problema"**.

Al tocarlo se abre una hoja con cuatro motivos de un solo toque:

- Falta un artículo
- Llegó dañado
- No me llegó
- Otro

Al elegir uno se abre el chat de soporte que ya existe, con el número de pedido y el motivo ya cargados arriba. El primer mensaje del chat queda registrado con el motivo elegido.

Este botón siempre va a **Soporte Hazorex**, nunca al repartidor.

## Punto importante antes de aplicar

El chat de soporte (`SupportChatSheet`) está escrito contra unas tablas que **no existen en la base de datos conectada**: las de incidencias, conversaciones y mensajes de soporte. Hoy el chat no puede abrirse porque no hay dónde guardar nada.

Por eso este cambio necesita una migración: crear esas tres tablas, con el motivo elegido guardado junto al ticket.

## Migración propuesta

- `support_issues` — pedido, cliente, **motivo** (falta_articulo / danado / no_llego / otro), producto (opcional), estado (abierto/cerrado), fechas.
- `support_conversations` — una conversación por incidencia, con estado.
- `support_messages` — mensajes de la conversación: quién envía (cliente / soporte / sistema), texto, fecha.
- Reglas de acceso: cada cliente solo ve y escribe en sus propias incidencias y mensajes; el administrador puede ver y responder todo. Permisos explícitos para que la app pueda leer y escribir.
- Realtime activado en los mensajes para que el chat se actualice solo.

No se toca ninguna tabla de clientes, pedidos, pagos ni Stripe.

## Archivos de la aplicación

1. `src/lib/support.functions.ts` — nueva función `createOrderIssue` (crea la incidencia con el motivo, abre la conversación y deja el primer mensaje) y ajuste de las consultas existentes al nombre real de las tablas.
2. `src/components/ReportIssueSheet.tsx` (nuevo) — la hoja con los cuatro motivos de un solo toque.
3. `src/routes/_authenticated/pedido.$id.seguimiento.tsx` — el botón "Reportar un problema" y la apertura del chat de soporte con el pedido ya cargado.
4. `src/components/SupportChatSheet.tsx` — mostrar el motivo elegido en la cabecera del ticket y tolerar incidencias sin producto asociado.

Textos en español e inglés usando los archivos de traducción existentes.

No publico nada: lo revisas en la vista previa.
