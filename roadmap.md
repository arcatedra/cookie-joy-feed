# Revisión final antes de apertura

## Correcciones del 10 de octubre y continuación
- [x] Aprobar el plan de correcciones de portada/textos y bloques reservables antes de cambios de más de tres archivos o pagos.
- [x] Corregir reel de canela; ocultar reels sin coincidencia real de sabor, sin borrar registros.
- [x] Usar catálogo y orden de ventas reales en Más Vendidas de la portada.
- [x] Retirar menciones comerciales de suscripciones y nombrar la baja como baja de correos.
- [x] Mostrar una sola promesa de entrega en el envío del carrito, sin cambiar cobros.
- [x] Verificar correcciones: portada/Confianza/carrito sin errores; 19 pruebas aisladas pasan.
- [x] Preparar reglas validadas de bloques, pesos, puerta, vehículos y piso horario, sin activarlas.
- [ ] Resolver financiación del pago fijo/bonos cuando superan los cargos de entrega de pedidos del lote; requiere decisión del dueño antes de integrar transferencias.
- [ ] Ejecutar el resto del modelo aprobado después de resolver financiación; mantenerlo inactivo hasta verificaciones completas.

## Nueva solicitud: bloques reservables (después de los nueve cambios)
- [x] Registrar montos editables, entrega en puerta, lotes/horarios, vehículos, incentivos, mensajes y control de tiempo en memoria y plan aprobado.
- [x] Mostrar y aprobar plan antes de reemplazar cargos/pagos del marketplace.
- [ ] Integrar bloques aprobados: financiación de importes que exceden los cargos de los pedidos pendiente de decisión del dueño; no modificar aún pagos existentes.

## Apertura: cambios solicitados el 9 de octubre

- [ ] Presentar el plan completo y esperar aprobación antes de cambios de pagos o más de tres archivos.
- [ ] Actualizar contacto, pie con sesión y textos SSN/Checkr/Stripe.
- [ ] Retirar reseñas inventadas y unificar catálogo/nombres/enlaces; Más Vendidas con ventas reales o orden fijo.
- [ ] Mínimo de galletas $12 en pantalla y servidor; cobro exacto y solo entrega programada.
- [ ] Enlaces Tiendas automáticos y únicos cuando existan tiendas aprobadas con productos.
- [ ] Eliminar suscripciones del código sin borrar tablas ni datos.
- [ ] Aplicar tarifas por parada/lote, extras sobre 45 lb y límites por vehículo a repartidor y admin sin recalcular datos históricos.
- [ ] Corregir diferencia inicial de textos React #418 y revisar hallazgos de Project monitoring.
- [ ] Ejecutar pruebas aisladas y revisar pantallas; entregar resumen y bloqueos sin publicar.

## Cambios de entrega, propina y referidos del 8 de octubre

- [x] Registrar los requisitos y revisar el funcionamiento actual.
- [x] Presentar el plan antes de cambiar pagos o permisos y esperar aprobación del dueño.
- [x] Unificar el texto de entrega solicitado en español e inglés.
- [x] Propina opcional en tienda y galletas con valores solicitados y destino íntegro al repartidor.
- [x] Bono único de $5 por primera compra cobrada, compartido entre tienda y galletas.
- [x] Saldo para descuentos en ambas compras y retiros seguros con historial.
- [x] Añadir Zelle o Cash App y destino (correo, teléfono o $cashtag) al retiro y mostrarlo en Retiros del administrador; plan aprobado.
- [x] Guardar método y destino en el mismo INSERT y comprobar automáticamente en PostgreSQL desechable que el retiro funciona y su destino no puede cambiarse: 30 pruebas pasan.
- [x] Verificar permisos, pruebas automáticas y botones públicos sin cobros reales, sin modificar usuarios/clientes ni publicar.
- [ ] Verificar compra, bono, transferencia y retiro con cuentas autorizadas: bloqueado por Supabase externo sin sesión de prueba disponible.

- [x] Aprobar el plan para cambios de más de tres archivos y posibles cambios de estructura.
- [x] Corregir textos de pago por pedido, días de entrega y pie duplicado en los nueve idiomas.
- [x] Unificar condados y código postal del negocio con las 42 zonas y Otras áreas.
- [x] Retirar la solicitud y el guardado de SSN, ITIN y cuentas bancarias en Hazorex, conservando datos existentes.
- [x] Persistir ambiente Stripe en pedidos/cuentas y bloquear transferencias cruzadas; pruebas automáticas pasan.
- [ ] Comprobar flujos completos de negocio, cliente, tienda, repartidor, galletas y referidos: bloqueado por falta de sesiones de prueba autorizadas en Supabase externo.
- [x] Revisar páginas públicas a 390 px: sin desbordamiento ni errores; añadir aviso de aprobación del repartidor.
- [ ] Confirmar recepción real de correos y pantallas de paneles autenticados: mismo bloqueo de acceso.
- [x] Comprobar limpieza: no se crearon usuarios, tiendas, productos ni pedidos de prueba en esta revisión.

## Revisión de los avisos de seguridad

- [x] Revisar los 22 avisos actuales y distinguir riesgos reales de accesos públicos necesarios.
- [x] Mostrar y aprobar el plan antes de aplicar cualquier cambio de permisos en la base de datos.
- [x] Corregir riesgos críticos y altos confirmados, sin cambiar datos de usuarios/clientes ni lógica de cobros salvo seguridad.
- [x] Verificar permisos resultantes y entregar tabla de resultados e instrucciones para contraseñas filtradas.

## Límites

- [x] Comprobar en pruebas aisladas que los bloqueos nuevos permiten compras de tienda/galletas, conservan la invitación del registro y bloquean solo el bono de familias con dirección compartida: seis casos nuevos y 36 pruebas totales pasan; Stripe simulado, sin cambios en producción.

- No publicar ni efectuar cobros reales.
- No modificar ni borrar usuarios o clientes reales.
- No afirmar pruebas completas cuando falte acceso autenticado seguro al Supabase externo.