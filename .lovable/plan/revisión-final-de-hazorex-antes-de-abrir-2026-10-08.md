# Revisión final de Hazorex antes de abrir

## Objetivo
Corregir las diferencias y comprobar cada resultado sin publicar, sin cobrar dinero real y sin modificar ni borrar usuarios o clientes reales.

## 1. Textos coherentes
- Reemplazar la promesa de $22 por hora por pago por pedido y “Cobras al entregar cada pedido”.
- Mostrar un ejemplo identificado como ejemplo, calculado con los precios vigentes: parte del envío + extra de peso, cuando aplique + propina. Aclarar que enviar la transferencia al entregar no garantiza que el banco la deposite inmediatamente.
- Corregir las promesas de entrega en 24 horas y plazos contradictorios para indicar lunes, miércoles y viernes, respetando fechas disponibles y hora de corte.
- Quitar el segundo pie de página en `/repartidores`.
- Aplicar las correcciones equivalentes a los nueve idiomas, sin cambiar diseños ni contenidos ajenos al pedido.

## 2. Condados y código postal
- En registro de negocios, seleccionar Manhattan, Brooklyn, Queens, Bronx o Staten Island y pedir un código postal válido de cinco dígitos.
- Usar las 42 zonas existentes de la base de datos, no otra lista fija de barrios. Ubicar el negocio por coincidencia exacta del código; aceptar códigos no incluidos como “Otras áreas”.
- Guardar el código postal del negocio y mostrar su condado y barrio. Detectar conflictos entre el condado elegido y un código conocido.
- Actualizar el filtro de `/tiendas` para usar condados y las zonas actuales; eliminar “Otra zona”. No sobrescribir ubicaciones de negocios existentes sin conocer su código postal.

## 3. Datos sensibles solo en Stripe
- Quitar SSN/ITIN de postulación y cualquier paso posterior de Hazorex; desactivar también la función que los recibe y guarda, no solo ocultar campos.
- Quitar formularios locales de cuentas bancarias y desactivar su guardado. Usar el registro de cobros de Stripe Accounts v2.
- Revisar que estos datos no sean obligatorios para aprobar o completar la postulación.
- Conservar las tablas y cualquier dato previo. Informar dónde existía el guardado, sin leer ni mostrar datos sensibles.

**Hallazgo confirmado:** existe `driver_tax_profiles`, pero actualmente contiene cero filas. El código también intenta guardar métodos bancarios en `driver_payout_methods`, que no aparece en la estructura actual consultada.

## 4. Seguridad de las pruebas
- Confirmar que vista previa y entorno local usan Stripe prueba, mientras el sitio publicado sigue en real.
- Revisar todo el recorrido: conexión, autorización, cobro, transferencia, reintentos y avisos. No basta con comprobar el botón Pagar.
- Evitar que una transferencia iniciada sin información del dominio termine usando Stripe real para un pedido de prueba. Mantener el modo correcto hasta el final, incluidos los avisos de Stripe.
- Mantener `source_transaction`, protección contra cobros o transferencias duplicados, 100% de productos para la tienda y reparto vigente del envío/peso/propina.
- No crear cuentas ni cargos reales. No cambiar globalmente a prueba el sitio publicado.

## 5. Comprobaciones y pruebas
Con acceso seguro disponible, crear únicamente registros nuevos identificados como `PRUEBA` y registrar sus identificadores para una limpieza exacta:

| Paso | Comprobación |
| --- | --- |
| Negocio | Registro con login, aprobación, aviso, conexión Accounts v2 y dos productos con peso visibles en tiendas. |
| Cliente | Registro, dirección/ZIP, pago 4242, margen de autorización y carrito. Probar también rechazo y cancelación conservando carrito. |
| Tienda | Preparar, ajustar cantidades/peso, Listo para recoger, cobro real de prueba y transferencia del 100% de productos. |
| Repartidor | Postulación sin datos fiscales/bancarios locales, aprobación/aviso, conexión, agrupación zona/ZIP, tomar, recoger, en camino y entrega con foto y transferencia. |
| Galletas | Compra desde `/shop` con 4242, sin cargos reales. |
| Cargos y referidos | Servicio del 18%, extra sobre 45 lb y recompensa de $5 una sola vez tras la compra válida del invitado. |
| Pantallas pequeñas | Tienda, carrito, negocio y repartidor: formularios, importes y botones sin cortes ni solapamientos. |

**Diferencia que revisar:** los ajustes vigentes tienen servicio del 18% y también un mínimo de $15. Confirmar cómo se aplica hoy y hacer que el importe cobrado y el texto coincidan; no eliminar silenciosamente ese mínimo como parte de una corrección de textos.

### Límite actual para la prueba completa
La base externa está compartida con producción. Actualmente hay cero negocios, productos de tienda y repartidores. Esta sesión no dispone de acceso autenticado de prueba/administrador ni de la clave de servicio que requieren aprobaciones, transferencias y otros pasos. No pediré contraseñas ni simularé acceso de administrador.

Tras aprobar el plan, comprobaré las pantallas públicas y cálculos y ejecutaré los pasos permitidos con seguridad. Si el acceso sigue faltando, indicaré exactamente qué acciones debe realizar el dueño desde sus paneles y marcaré esos pasos como **FALLA — bloqueado/no probado**, nunca como OK. Una llamada directa a Stripe no contará como prueba completa desde la app.

## 6. Limpieza y entrega
- Limpiar únicamente registros y cuentas de prueba creados durante esta revisión, usando sus identificadores, no una búsqueda amplia por nombre que pueda borrar pruebas anteriores.
- Cancelar/liberar reservas de prueba y retirar cuentas Stripe de prueba cuando el proveedor lo permita; informar cualquier elemento que no pueda borrarse.
- Eliminar cuentas nuevas de prueba solo cuando sea seguro y posible, sin tocar usuarios/clientes reales. No borrar datos reales ni históricos ajenos a esta revisión.
- Entregar la tabla final por paso con **OK o FALLA**, corrección aplicada y bloqueo concreto si existe.
- No publicar. No declarar “todo funciona” si un paso no pudo probarse.

## Detalles técnicos
- Cambios previstos: páginas de repartidores/registro/tiendas y pantallas vinculadas de negocio y repartidor; pie compartido; nueve traducciones; validación/guardado de negocio; funciones fiscales y de wallet; propagación del ambiente Stripe en pagos, transferencias y webhooks; pruebas dirigidas.
- Prever migración mínima para guardar ZIP del negocio y, si es necesario, el ambiente Stripe de pedidos/cuentas. Sin borrar tablas, sin modificar usuarios/clientes reales. Cualquier migración tendrá permisos explícitos y respetará las reglas actuales de acceso.
- Crear pruebas de regresión para ZIP/zonas, días, importes y aislamiento prueba/real. Comprobar errores actuales y resultados de las pruebas antes de informar cada OK.
- Documentar las decisiones de estructura en `AGENTS.md` y mantener la lista de pendientes actualizada.

La aprobación autoriza estas correcciones y las pruebas limitadas a modo prueba, no la publicación ni operaciones monetarias reales.