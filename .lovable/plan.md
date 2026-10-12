# Despensa del supermercado Hazorex

## Productos y nombres
- Añadir **72 productos** de tu lista: Arroz y granos 10, Pastas 8, Enlatados 15, Salsas y condimentos 7, Aceites y especias 12, Para hornear 12 y Desayuno 8.
- Todos se venden **por unidad**, con los precios y pesos en lb que indicaste, aunque el peso aproximado difiera del peso neto del empaque.
- Nombres **Marca + producto en ES/EN**, tamaño o cantidad indicada y una descripción corta propia en ambos idiomas.
- Guardar **Food Bazaar** como dónde comprarlo, visible solo para admin/repartidor. No inventar su dirección.

## Siete subcategorías
- Compartir las siete subcategorías entre la tienda y el administrador.
- Clasificar los cinco existentes sin duplicarlos ni cambiar sus precios, pesos o fotos: **Barilla espaguetis → Pastas; Goya frijoles negros → Enlatados; Jif, Frosted Flakes y Café Bustelo → Desayuno**.
- Comprobar los nombres existentes y conservar sus identificadores; ajustar únicamente el orden Marca + producto ES/EN si hace falta.
- Resultado esperado: **77 productos en Despensa**, sujeto a comprobar si existe alguna otra coincidencia antes de añadir.

## Fotos
- Buscar cada producto nuevo en **Open Food Facts** por marca, nombre, variedad y presentación.
- Solo aceptar una foto frontal con coincidencia exacta. Descargarla a nuestro almacenamiento, conservar el original y editar únicamente el fondo: blanco cuadrado, producto completo y centrado, sin modificar etiquetas, logos o colores.
- Guardar código de barras, origen, licencia y original; mostrar **“Foto: Open Food Facts (CC BY-SA), fondo editado”** solo en las fotos verificadas correspondientes.
- Si no hay coincidencia exacta utilizable, crear una **foto propia realista del producto genérico, sin marcas, logos ni etiquetas de marca**, sobre blanco. No atribuir estas fotos a Open Food Facts.
- Donde falte tamaño, cantidad o variedad suficiente para confirmar el empaque, usar foto genérica; no inventar esos datos ni sustituir por otra presentación.
- Nunca copiar fotos de Instacart ni tiendas. Descartar cualquier edición que altere el producto.

## Comprobaciones y entrega
- Verificar cantidades por subcategoría, nombres ES/EN, precios, pesos y venta por unidad contra tu lista.
- Comprobar que los cinco existentes se conservan y que no aparecen duplicados en español ni inglés.
- Revisar fotos, créditos, búsqueda y filtros en español/inglés, celular y escritorio; ejecutar las pruebas del catálogo.
- Entregar una lista corta: **productos añadidos, con foto real y con foto propia**, indicando cualquier excepción.

## Límites
**Sin publicar, sin tocar Stripe, checkout, propinas, pagos, pedidos ni datos de usuarios/clientes.** No cambiar precios o pesos de productos existentes ni permisos actuales.

## Detalles técnicos
- Reutilizar el catálogo y la pantalla de supermercado existentes, sin crear otra tienda ni otro sistema de compra.
- Añadir un catálogo de referencia de Despensa y pruebas; ampliar las reglas compartidas de subcategorías para que funcionen tanto en público como en admin.
- Aplicar una migración limitada a la restricción de subcategorías, inserciones literales de productos nuevos y su información privada de abastecimiento, y clasificación de registros existentes por ID con guardas de valores previos y duplicados ES/EN. Conservar todas las subcategorías anteriores.
- Reutilizar almacenamiento y campos actuales de imágenes y atribución, sin nuevas tablas.

**Se espera tu OK antes de añadir productos, modificar el catálogo o preparar sus fotos.**