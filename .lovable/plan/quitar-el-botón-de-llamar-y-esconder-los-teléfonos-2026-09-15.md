# Quitar el botón de llamar y esconder los teléfonos

## Qué va a cambiar para las personas

- En la pantalla de seguimiento del cliente desaparece el botón de llamar al repartidor. Queda solo el chat de la app.
- En la pantalla de navegación del repartidor desaparece el botón "Llamar". Queda solo el chat de la app (y el botón "Abrir ruta", que no cambia).
- Ni el cliente ni el repartidor podrán obtener el número del otro por ningún medio, ni siquiera mirando los datos que viajan por detrás.

## Qué se encontró

Hoy el número sí viaja al navegador aunque no siempre se vea:

- La consulta del seguimiento del cliente pide el teléfono del repartidor (tabla de repartidores).
- La consulta del pedido del repartidor pide "todas las columnas", así que incluye el teléfono de quien recibe y el del punto de recolección.

## Cómo se arregla (en el servidor)

- Seguimiento del cliente: se deja de pedir el teléfono del repartidor. Solo nombre, foto, calificación, ubicación y si está en línea.
- Pedido del repartidor: se cambia "todas las columnas" por una lista explícita que **excluye** los teléfonos.
- Así el dato ya no sale de la base de datos hacia el navegador; no basta con ocultarlo en pantalla.

## Archivos

- `src/lib/tracking.functions.ts`: quitar el teléfono del repartidor de la consulta y del tipo de datos.
- `src/lib/courier.functions.ts`: en el detalle del pedido, columnas explícitas sin teléfonos.
- `src/routes/_authenticated/pedido.$id.seguimiento.tsx`: quitar el botón de llamar.
- `src/routes/_authenticated/repartidor.pedido.$id.navegacion.tsx`: quitar el botón "Llamar".
- `src/lib/driver-routes.ts`: quitar el campo de teléfono del tipo de datos de las paradas.

Sin cambios en la base de datos. No se toca el checkout, Stripe, pagos ni la tabla de clientes. No se publica nada.
