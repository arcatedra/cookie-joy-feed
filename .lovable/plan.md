# Ampliar frutas y verduras de Supermercado Hazorex

## Productos y precios
- Revisar toda la lista contra el catálogo actual por producto, marca, presentación y códigos. Añadir solo productos distintos; si uno ya existe, conservar su registro y actualizar únicamente el precio o los datos expresamente indicados, sin duplicarlo.
- Mantener exactamente tus precios de Food Bazaar del 18/10/2026, con 0 % de sobreprecio. Solo los productos marcados `/lb` se venden por libra; los demás, por unidad o presentación.
- Guardar nombres ES/EN con la marca al principio, descripción corta propia y tamaño indicado. No inventar tamaños de paquetes; cuando falte el peso, usar una estimación identificada como aproximada para el cálculo existente por peso.
- Usar las subcategorías actuales: Frutas para frutas y Verduras para verduras y hierbas, sin crear una nueva.
- Guardar Food Bazaar como lugar de compra solo para admin y repartidor autorizado, sin inventar dirección.

## Fotos y escáner
- Consultar cada UPC indicado en Open Food Facts y revisar foto frontal, marca y presentación antes de aceptarla. Guardar el código para el escáner aunque no haya foto disponible, comprobando que no corresponda a otro producto.
- Descargar las fotos aceptadas al almacenamiento propio, limpiar el fondo sin alterar etiquetas ni cortar el producto y conservar el original. Mostrar «Foto: Open Food Facts (CC BY-SA)»; añadir «fondo editado» si se modifica.
- Si falta UPC o foto válida, reutilizar primero una imagen del catálogo que represente fielmente el producto. No usar un envase de otra marca ni una imagen que confunda fruta entera con cortada.
- Solo cuando no haya imagen adecuada, crear una foto genérica propia sobre blanco, sin marcas ni logos. Nunca copiar imágenes de Instacart, Walmart o Google.

## Comprobaciones y entrega
- Probar precios exactos, venta por unidad/libra, clasificación y códigos indicados. Comprobar que una segunda carga no duplique productos y que los demás registros conserven sus datos.
- Verificar buscador, filtros e imágenes realmente cargadas en celular y computadora, sin iniciar pagos.
- Entregar los totales realmente añadidos y las listas de fotos de Open Food Facts, reutilizadas y creadas; informar coincidencias existentes, códigos dudosos o imágenes pendientes.

## Límites
- No tocar checkout, Stripe, propinas, cargos de entrega ni usuarios/clientes. No publicar.
- El catálogo es compartido: los productos guardados se verán también en la web publicada, aunque no se publique una nueva versión.

## Detalle técnico
- Reutilizar campos existentes de productos, códigos múltiples y `store_product_sourcing`; no se prevé modificar la estructura de la base de datos.
- Cargar datos mediante una operación protegida e idempotente, con comprobaciones de coincidencias y conservación de identificadores. Sincronizar las referencias de catálogo y añadir pruebas de los valores recibidos.
- Guardar medios nuevos mediante el flujo de imágenes del proyecto y mantener créditos vinculados a la foto correspondiente.
- El trabajo afectará a más de tres archivos, por lo que se aplicará solo después de aprobar este plan.