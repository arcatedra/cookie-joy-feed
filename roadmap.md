# Revisión final antes de apertura

## Seguridad y QA (20 oct): aprobación por etapas
- [x] Presentar plan individual de los 22 avisos Supabase, los 11 del análisis adicional y QA; distinguir riesgos y autorizaciones específicas.
- [x] Consultar reglas actuales sin cambios: 18 funciones distintas/20 avisos de ejecución; HAZOREX bloqueada; search_path definido. Sin reglas temporales de escritura libre en los dos depósitos.
- [x] Clasificación limitada de archivos: reels-media contiene 9 JPEG/10 MP4 y store-media 1017 JPEG; el tipo de archivo no prueba ausencia de contenido privado. Lectura pública usada para fotos comerciales; no cerrar permisos a ciegas.
- [ ] Ejecutar pruebas aisladas de comprobante, ETA y nombres públicos; no equivalen a verificar los 22 avisos completos ni el recorrido autenticado.
- [ ] Cambios de permisos compartidos con producción: esperan autorización específica y propuesta exacta; no aplicar bajo aprobación general.
- [ ] QA de sustituciones por libra y cualquier ajuste de saldo/cobro: esperan autorización explícita de pagos y guardado del artículo del pedido.
- [ ] Protección de contraseñas filtradas: activación manual del dueño en Supabase, Pro o superior. No modificar clientes ni publicar.

## Mascotas (20 oct)
- [x] Aprobada primera etapa: preparar lista/precios sin cargar ni generar fotos; segundo OK necesario para carga amplia y fotos.
- [x] Recibida lista exclusiva del dueño con precios originales confirmados: 201 productos, ocho subcategorías; no buscar otros precios.
- [x] Plan aprobado para los 201 productos y fotos propias en ocho grupos.
- [x] Incorporados 201 registros sin duplicados, precios/tamaños y unidades exactos: 197 visibles y cuatro ocultos por texto incorrecto de sus fotos. Los 1108 productos anteriores conservan su hash completo sin cambios.
- [x] Comprobados los 201 precios/tamaños/modalidades y 197 fotos cargadas en la tienda; filtros y tres pads comprobados, sin errores de página; 39 pruebas pasan y build OK. Sin seguridad, pagos, entrega, clientes ni publicación.
- [x] Corregidas y activadas solo las cuatro fotos autorizadas: Fancy Feast pollo y pavo 3 lb; IAMS Proactive pollo adulto 3.5 lb; Fancy Feast Gravy Lovers corazones e hígado de pollo 3 oz; Arm & Hammer Clump & Seal Ultra Odor Blasters 19 lb. Las cuatro tarjetas cargan en vista previa; precios intactos y 19 pruebas pasan, build OK. Sin otros productos, seguridad, pagos, entrega, clientes ni publicación.

## Bebé (20 oct)
- [x] Aprobar y aplicar las once subcategorías.
- [x] Cargados 132 productos y fotos propias; 976 existentes sin cambios. Precios del listado Food Bazaar, ninguno de Instacart directo; Swaddlers talla 6/16 ct y Nido 4.85 lb requieren confirmación de presentación/precio en tienda. Parent's Choice, Aveeno Baby, chupetes y cremas específicas no localizados; Vaseline es barrera genérica, no crema especializada.
- [x] Vista previa computadora/celular: 132 fotos de Bebé cargadas, sin desbordamiento ni errores; Goldfish Colors 9 packs, Ritz 10 packs y Club 12.7 oz comprobados. 26 pruebas pasan; corregida paginación pública para mostrar los 1108 productos completos. Sin publicar ni tocar pagos/entrega/clientes.

## Bebidas Food Bazaar (19 octubre)
- [x] Preparar 123 referencias con tamaños y fuentes: 73 nuevos con precio original reconfirmado, 45 nuevos pendientes y cinco existentes; sin inventar precios ni cargar catálogo.
- [x] Plan aprobado: incorporar solo 73 nuevos con precio regular confirmado; 45 pendientes no cargados.
- [x] Incorporados 73 nuevos y clasificados cinco existentes (78 en Bebidas), nueve filtros y 73 fotos propias; sin nuevos UPC no verificados. Dos precios existentes corregidos, Café Bustelo trasladado conservando ID/precio. 31 pruebas pasan y 73 precios comprobados en lectura guardada; 518 registros anteriores conservados fuera de los campos aprobados. Fotos/filtros/búsqueda/carrito verificados en 390/1280 px sin errores. Sin pagos/entrega/clientes ni publicación; admin autenticado y escáner físico no disponibles en este entorno.

## Snacks Food Bazaar (18 octubre)
- [x] Plan aprobado; la lista real contiene 67 nuevos (el plan contó 78 por error), más corrección de Cheez-It 7 oz.
- [x] Añadidas siete subcategorías, 67 nuevos ES/EN, precios regulares, 17 fotos OFF y 50 propias; cinco UPC de tamaño exacto.
- [x] Catálogo guardado y Cheez-It corregido a $4.19; 68 productos y fotos comprobados en vista previa. Sin pagos/clientes ni publicación.

## Corrección de precios regulares (18 octubre, 18:05 UTC)
- [x] Plan aprobado y 43 precios únicos actualizados; frambuesas $6.99 y moras $5.69 confirmados.
- [x] Verificados los 43 precios en catálogo público y lectura guardada: 408 otros productos idénticos; nombres/fotos/unidades/pesos/UPC conservados en los 451 registros. 384 pruebas pasan, sin errores de página ni pagos; no publicado. Regla de precio regular guardada.

## Ampliación Food Bazaar: frutas, verduras y hierbas (18 oct)
- [x] Aprobar plan antes de cambios amplios: 111 solicitudes, 105 nuevos y seis registros coincidentes conservados; 451 productos totales.
- [x] Consultar 10 UPC y revisar fotos: seis OFF con originales intactos, 31 reutilizadas y 74 propias. Siete UPC guardados; no asignar código de café a pimientos ni códigos de paquetes 2 lb/3 lb a dátiles 12 oz/kiwi 1 lb. Guardar precios, tamaños aproximados cuando faltan, ES/EN y Food Bazaar restringido.
- [x] Verificar 111 precios/modalidades/clasificaciones/códigos y fotos decodificadas; seis identificadores conservados, 340 demás filas idénticas, sin duplicados por nombres ES/EN. 341 pruebas pasan; carrito real $6.99, celular sin desbordamiento, sin errores ni pagos. No publicar ni tocar pagos/clientes. Admin autenticado y escaneo físico no disponibles en este entorno.

## Precio justo Food Bazaar (18 oct)
- [x] Aprobar plan para precios y modalidades de la lista recibida, sin sobreprecio, texto público y pruebas.
- [x] Actualizar 93 precios existentes con comprobación previa; 13 cambios a venta por libra y sandía a 12 lb. Sincronizar 87 referencias; seis productos previos identificados, ninguno faltante. No tocar pagos, entrega ni clientes.
- [x] Verificar los 93 valores/modalidades desde la pantalla real y los 15 productos de Frutas y verduras no indicados, sin cambios; 346 productos conservados con hash idéntico de nombres/fotos/metadatos. 110 pruebas pasan; sandía estimada y carrito $15.48, texto visible y celular/escritorio sin errores ni desbordamiento. No existía +5 % automático. Sin publicar; catálogo compartido actualizado, edición admin autenticada no disponible en Supabase externo.

## Diseño del supermercado y portada
- [x] Aprobar ajustes exclusivamente visuales: barra compacta con carrito deslizable, cuarta tarjeta, cuatro destacados y Cómo funciona.
- [x] Implementar y verificar celular (390 px) y computadora (1280 px): cuatro unidades reales, subtotal correcto, abrir/cerrar y conservar propina; cuatro destacados con fotos, sin hueco antes del pie ni desbordamiento. Pasaron 19 pruebas del catálogo. Sin pagos, cambios de precios/base de datos ni publicación.

## Cantidades reales de pedidos de tienda
- [x] Confirmar con código actual y reproducción aislada que 3 unidades pedidas y 2 reales siguen calculándose como 3.
- [x] Aprobar el plan antes de modificar el cálculo usado para cobrar.
- [x] Corregir cantidades parciales y comprobar ambos caminos de preparación, conservando el escaneo obligatorio y el peso real; 23 pruebas pasan, cinco sobre el cobro con Stripe simulado, sin cobros reales ni publicación.
- [ ] Revisar ambas pantallas con un pedido y sesión autorizada: acceso autenticado no disponible para Supabase externo; pruebas aisladas del cálculo y guardado completadas.

## Correcciones del 10 de octubre y continuación
- [x] Aprobar el plan de correcciones de portada/textos y bloques reservables antes de cambios de más de tres archivos o pagos.
- [x] Corregir reel de canela; ocultar reels sin coincidencia real de sabor, sin borrar registros.
- [x] Usar catálogo y orden de ventas reales en Más Vendidas de la portada.
- [x] Retirar menciones comerciales de suscripciones y nombrar la baja como baja de correos.
- [x] Mostrar una sola promesa de entrega en el envío del carrito, sin cambiar cobros.
- [x] Verificar correcciones: portada/Confianza/carrito sin errores; 19 pruebas aisladas pasan.
- [x] Preparar reglas validadas de bloques, pesos, puerta, vehículos y piso horario, sin activarlas.
- [x] Exigir mínimo 3 pedidos por lote; combinar sobrantes de 1–2 con zona cercana o avisar al admin para decisión manual.
- [x] Reemplazar aumentos automáticos por aviso a 12 horas y controles manuales +$5, +$10 o monto escrito.
- [x] Cobrar puerta como ingreso Hazorex; bono al repartidor opcional por lote, apagado por defecto y visible solo al activarlo.
- [x] Integrar pagos finales, autoasignación, navegación, mensajes, reclamos y reportes; mantener todo inactivo hasta verificaciones completas del dueño.

## Nueva solicitud: bloques reservables (después de los nueve cambios)
- [x] Registrar montos editables, entrega en puerta, lotes/horarios, vehículos, incentivos, mensajes y control de tiempo en memoria y plan aprobado.
- [x] Mostrar y aprobar plan antes de reemplazar cargos/pagos del marketplace.
- [x] Integrar transferencias finales de bloques con reparto idempotente entre cargos cobrados; mantener inactivo hasta pruebas completas.
- [ ] Validar el recorrido autenticado y una transferencia Connect de prueba con cuentas autorizadas; bloqueado por falta de sesión administrada en Supabase externo.

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
## Supermercado propio (11 oct)
- [x] Aprobar plan de Despensa: 72 productos de marca, siete subcategorías y clasificación de cinco existentes sin duplicados.
- [x] Incorporar 72 productos Despensa ES/EN: una foto real OFF exacta con original conservado y 71 fotos propias; clasificar cinco existentes sin duplicarlos ni cambiar sus precios, pesos o fotos.
- [x] Verificar 72 coincidencias exactas con el catálogo y 77 productos totales, siete filtros, fotos cargadas, búsqueda y celular sin errores; 26 pruebas pasan, sin publicar ni tocar pagos/clientes.
- [x] Aprobar plan para nombres con marca: 32 Panadería y 41 Lácteos y huevos, sin cambiar precios/pesos.
- [x] Aplicar 73 nombres ES/EN por identificador existente; buscar fotos OFF y rechazar marcas/tamaños/etiquetas incorrectos. Seis fotos exactas aceptadas con fondo blanco y originales: Pepperidge Farm Farmhouse, Thomas' English muffins, ambos Stonefire naan, Organic Valley 1% y Daisy 16 oz. Los otros 67 conservan foto actual porque no hubo coincidencia exacta utilizable y completa; OFF presentó errores 403/503. No usar las ediciones generadas que alteraron etiquetas.
- [x] Verificar 274 productos antes/después: mismos identificadores, precios/pesos y demás campos fuera de nombres/fotos autorizados; 22 pruebas pasan. Seis fotos cargan en la tienda, crédito/original/código comprobados, celular sin desbordamiento y sin errores; build OK. Sin publicar ni tocar pagos/clientes.
- [x] Aprobar plan de Panadería: 38 productos, cinco subcategorías y fotos genéricas ausentes de cheddar/pavo.
- [x] Incorporar 38 productos de Panadería sin duplicados, con precios/pesos indicados, fotos propias y descripciones ES/EN; Food Bazaar en información restringida. Completar fotos ausentes de cheddar Kraft/pavo Butterball sin alterar otros datos.
- [x] Verificar cinco filtros (9/7/6/9/7), 38 fotos cargadas, búsqueda ES/EN y celular/escritorio sin errores; 19 pruebas pasan y 38 filas coinciden exactamente con catálogo aprobado. Ninguno nuevo sin foto. Sin publicar ni tocar pagos/clientes; edición admin no comprobada por Supabase externo sin sesión autorizada.
- [x] Aprobar plan de Lácteos y huevos: 41 productos genéricos, seis subcategorías, clasificación de ocho existentes y fotos faltantes de huevos/Reddi-wip.
- [x] Añadir 41 productos con fotos propias y ES/EN; 49 total sin duplicados, seis filtros y fotos verificadas en celular/escritorio ES/EN; 17 pruebas pasan. Ocho existentes conservados; huevos y Reddi-wip con foto propia. Foto faltante de Kraft cheddar rallado completada con Panadería. Sin tocar pagos/clientes ni publicar.
- [x] Aprobar plan para 64 carnes y mariscos, seis subcategorías y fotos propias.
- [x] Añadir 64 productos con foto y descripciones ES/EN, sin duplicar ni alterar los cinco de marca; 14 pruebas pasan, seis filtros y fotos verificadas en celular/escritorio sin errores. Foto faltante de pavo molido Butterball completada con Panadería.
- [ ] Verificar edición autenticada de las nuevas subcategorías en admin: bloqueado por Supabase externo sin sesión autorizada; validación del servidor cubierta por pruebas.
- [x] Incorporar partes 2A y 2B: 59 verduras con precios/pesos indicados, fotos propias y descripción ES/EN; plan ampliado aprobado, 2A cargada una sola vez.
- [x] Verificar totales: 47 frutas y 61 verduras (108); todos con foto; filtros/buscador ES/EN y celular comprobados, 11 pruebas aprobadas.
- [x] Aprobar el plan para 43 frutas nuevas, fotos propias, descripciones ES/EN y subcategorías Frutas/Verduras.
- [x] Añadir y verificar catálogo de frutas sin duplicados; conservar productos existentes y no tocar pagos/clientes ni publicar.
- [ ] Aprobar plan de fondos blancos con originales conservados y 13 productos nuevos de Lácteos y huevos / Carnes y mariscos.
- [ ] Aplicar fotos verificadas, créditos de edición y catálogo nuevo; comprobar resultados y comunicar excepciones sin publicar ni tocar pagos/clientes.
- [x] Aprobar plan de fotos reales Open Food Facts, créditos/códigos de barras, precios regulares y seis productos nuevos antes de cambios de catálogo.
- [x] Aplicar y verificar catálogo autorizado: 16 productos, ocho fotos exactas guardadas con crédito/código, tres fotos existentes conservadas sin coincidencia; seis pruebas pasan, celular/escritorio sin errores, sin publicar ni tocar pagos/clientes.
- [x] /admin/productos, /supermercado, reemplazo en pago, 10 productos de prueba.
- [ ] Probar /admin/productos con sesión de admin (sin sesión autorizada en esta vista previa).
