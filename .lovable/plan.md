# Preparación antes de publicar

Cuatro bloques: prueba completa del pedido, textos legales, pie de página y revisión de seguridad. No se toca el checkout de galletas ni la tabla de usuarios/clientes. No se publica.

## 1. Prueba completa de un pedido (modo prueba)

Simulo un pedido real de principio a fin usando el navegador y la base de datos de prueba, y te digo qué falla:

- Cliente hace el pedido → se reserva el dinero (total + 15%).
- La tienda marca "Listo para recoger" → se cobra el monto real con el peso real.
- El repartidor marca "Entregado" → se registran los pagos.
- Se ejecuta el pago automático: transferencia al súper y al repartidor (incluida la propina 100% suya).

Casos extra que pruebo:
- Pedido de más de 45 lb (debe sumar $0.70 por libra extra).
- Pedido de más de 120 lb (debe bloquearse con aviso de dividir la compra).
- Día de entrega fuera de ruta (debe rechazarse).
- Tarjeta que falla (4000 0000 0000 0259): el pedido no debe quedar a medias.
- Bono de referido de $5: se acredita al que invitó cuando se entrega la primera compra del invitado.

Entrego un reporte con lo que pasó en cada caso y arreglo lo que se rompa.

## 2. Términos y Privacidad (español e inglés)

Actualizo /terms (a donde ya redirige /terminos) y /privacidad con el modelo actual:
- Cobro por pedido; ya no existen suscripciones.
- Cargo de entrega según tamaño del pedido y peso, mostrado como un único precio final.
- Se reserva el total + 15% y después se cobra solo el monto real.
- Propinas: 100% para el repartidor.
- Repartidores: contratistas independientes, no empleados.
- Reembolsos, faltantes y sustituciones.
- Los precios pueden variar respecto a la tienda física.
- Bono de referidos de $5 y sus reglas antifraude.
- Pagos a súpers y repartidores mediante Stripe Connect.

Los textos se agregan a los archivos de idioma; español e inglés escritos a mano y el resto de idiomas hereda el inglés hasta que quieras traducirlos.

## 3. Redes sociales en el pie de página

Quito Instagram y TikTok con la etiqueta "Próximamente". Como no hay un enlace real de Facebook confirmado, quito toda la sección "Síguenos". Si me pasas el enlace de Facebook, lo dejo con ese único botón.

## 4. Revisión de seguridad

Lo que ya detecté y pienso arreglar:
- Los archivos de las tiendas (logos y fotos de productos) hoy los puede descargar cualquiera aunque el depósito sea privado: lo limito a imágenes de negocios aprobados y a su propio dueño/admin.
- Los ajustes de entrega hoy los puede leer cualquier persona con sesión: lo dejo solo para administradores.

Lo que reviso y reporto:
- Tablas sin reglas de acceso.
- Datos sensibles: SSN/ITIN (ya cifrados), documentos de repartidores, direcciones de clientes.
- Depósitos de archivos públicos vs. privados.
- Funciones del servidor que se puedan llamar sin permiso.
- Que ninguna clave secreta de Stripe llegue al navegador.

Lo que no cambio sin tu OK: lecturas públicas que son intencionales (precios, productos, reels, días de entrega por zona).

Al final: lista corta de hallazgos y lista de pendientes para publicar.

## Detalles técnicos

- Prueba end-to-end con Playwright contra el servidor local + llamadas directas a las funciones de servidor (`createStoreCheckout`, `markOrderReadyAndCapture`, `markOrderDelivered`, `/api/public/payout-run`) en Stripe sandbox.
- Legales: `src/routes/terms.tsx`, `src/routes/privacidad.tsx` y claves nuevas en `src/locales/es` y `src/locales/en`.
- Pie: `src/components/SiteFooter.tsx`.
- Seguridad: migración con políticas nuevas en `storage.objects` (bucket store-media) y en `delivery_settings`.
