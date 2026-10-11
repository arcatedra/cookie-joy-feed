# Fotos reales y precios regulares — Supermercado Hazorex

## Qué cambiará
- Actualizar los precios de los diez productos existentes con los importes que indicaste, manteniendo sus pesos y su venta por unidad o por libra. Quitar cualquier precio anterior que los haga aparecer como ofertas falsas.
- Agregar los seis productos nuevos con nombre español/inglés, categoría, tamaño, precio y peso indicados. “Dónde comprarlo”: Food Bazaar; no inventar una dirección.
- Buscar en la API pública de Open Food Facts la foto frontal de cada producto de marca, incluidas las fresas Driscoll’s. Verificar marca, variedad y presentación exacta: no sustituir un paquete de 24 por una botella individual ni usar tamaños distintos.
- Descargar las fotos confirmadas y guardarlas en el almacenamiento propio de fotos; nunca mostrar imágenes enlazadas directamente a Open Food Facts ni copiar imágenes de tiendas o generar etiquetas con IA.
- Si no hay coincidencia exacta con foto frontal, conservar la imagen actual. Para productos nuevos sin coincidencia, usar un marcador neutro sin inventar envases de marca. Informarte de cada caso.
- Las frutas y verduras sin marca conservan sus fotos actuales.
- Guardar por producto el código de barras verificado, el crédito, la página de origen y la licencia de la foto. No inventar códigos para productos sin coincidencia.
- Mostrar en letra pequeña “Foto: Open Food Facts (CC BY-SA)” junto a cada foto importada y la misma línea en el pie de /supermercado, con enlace a la fuente/licencia.

## Cambios que necesitan tu OK
Agregar campos de código de barras y crédito/origen de foto al catálogo existente. Este cambio de base de datos y los cambios en varias pantallas requieren tu aprobación según tus reglas.

## Comprobaciones
- Revisar visualmente que cada foto corresponde a la marca, variante y tamaño correctos.
- Comprobar los 16 productos, precios, categorías y pesos; que la edición del admin conserve los créditos y que no se creen duplicados al repetir la carga.
- Verificar que las fotos se sirven desde almacenamiento propio, que sus créditos aparecen y que las búsquedas/productos por libra siguen funcionando.
- Revisar /supermercado en celular y escritorio y ejecutar las pruebas del catálogo pertinentes. Informar cualquier comprobación que no pueda realizarse por falta de sesión autorizada.

## Límites
No publicar. No modificar Stripe, checkout, propinas, usuarios ni clientes. No hacer cobros. Los precios nuevos afectarán futuras compras del catálogo, no los importes guardados de pedidos anteriores.

## Detalle técnico
- Migración aditiva en `store_products` para metadatos de foto y código de barras; actualizaciones limitadas a los diez productos de `hazorex-supermercado` e inserciones literales de los seis nuevos, sin tocar pedidos existentes.
- Conservar permisos actuales: catálogo público, edición solo admin, “Dónde comprarlo” privado.
- Ajustar validación/guardado del catálogo y las vistas de productos necesarias para conservar y mostrar atribución. Usar el almacenamiento existente y el flujo de archivos del proyecto; sin crear un importador general ni cambiar pagos.
- Consumir la API de Open Food Facts con identificación de Hazorex y respetando sus límites; conservar la procedencia verificable de cada descarga.