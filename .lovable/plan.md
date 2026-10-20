# Cargar la lista confirmada de Mascotas

## Alcance y gasto
Son **201 productos en ocho subcategorías**: 20 de perro seco, 26 de perro húmedo, 11 premios para perros, 3 pads, 28 de gato seco, 60 de gato húmedo, 14 premios para gatos y 39 de arena/accesorios.

Puede requerir **hasta 201 fotos nuevas**, además de cargar la lista. Es un trabajo grande; no puedo garantizar un número exacto de créditos. No generar fotos ni cargar productos hasta aprobar este plan.

## Cambios
- Cargar exclusivamente la lista del dueño del 20 de octubre, 04:22 UTC: conservar cada precio original y tamaño exactos, 0 % sobreprecio, por unidad. No buscar otros precios.
- Comparar solo esa lista con el catálogo para evitar duplicados, conservando los identificadores existentes.
- Crear las ocho subcategorías indicadas, nombres españoles con marca primero y descripciones propias cortas; mantener su equivalente inglés.
- Crear fotos propias sobre blanco, con marca, sabor y presentación exactos. Si ya hay un UPC fiable y foto frontal coincidente de Open Food Facts, usarla con crédito; no realizar búsquedas largas de códigos ni usar fotos de otras tiendas.
- Revisar únicamente los productos y fotos añadidos. Si una foto no cumple, informar y detener ese intento, sin repetir en bucle.
- Entregar cantidad añadida y cualquier producto pendiente, con el motivo.

## Límites
No cambiar seguridad, otros productos o precios, pagos, entrega ni clientes. No publicar.

## Detalles técnicos
Usar el catálogo compartido existente, identificadores estables, validación de subcategoría contra categoría y pruebas pequeñas de precios/tamaños de esta lista. Añadir las ocho opciones a la validación existente y, si corresponde, actualizar únicamente la validación de subcategorías en la base de datos. Verificar los valores guardados y las fotos en la vista previa, sin pedidos ni cobros.