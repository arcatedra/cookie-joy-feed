# Lácteos y huevos del Supermercado Hazorex

## Qué se añadirá
- **41 productos de tu lista**, todos por unidad, con los nombres ES/EN, precios y pesos aproximados que indicaste:
  - Leche: 8.
  - Cremas: 6.
  - Huevos: 4.
  - Quesos: 13.
  - Yogur: 5.
  - Mantequilla: 5.
- Las seis subcategorías estarán disponibles en **/supermercado** y **/admin/productos**, igual que Frutas y Carnes.
- Una descripción corta propia ES/EN y una foto individual propia por producto: realista, sobre blanco, con envase liso cuando corresponda, sin marcas, logos ni etiquetas de marca. No se copiarán fotos de tiendas.
- “Dónde comprarlo”: **Food Bazaar**, sin inventar dirección; visible solo para admin y repartidor autorizado.

## Los ocho productos existentes
- Conservar sus nombres, precios, pesos y fotos actuales; clasificarlos así:
  - **Leche:** Organic Valley y Fairlife.
  - **Cremas:** Reddi-wip.
  - **Huevos:** Huevos grandes 12 unidades.
  - **Quesos:** Kraft mozzarella rallada, Kraft cheddar rallado, Philadelphia y Polly-O.
- Se comprobó que **Huevos grandes 12 unidades y Reddi-wip siguen sin foto**: añadirles fotos propias genéricas sin marca, como pediste, sin atribuirlas a Open Food Facts.
- **Kraft cheddar rallado 8 oz también está sin foto**; se conservará sin reemplazarlo y se incluirá en el resumen de fotos pendientes. Sus fotos de marca siguen sujetas a la regla de coincidencia exacta de Open Food Facts.
- Antes de insertar, comparar nombres ES/EN, tamaño y variante para evitar duplicados. Las presentaciones distintas se conservan como productos separados. Si todos los de la lista son distintos, habrá **49 productos en total**.

## Comprobaciones
- Comparar los 41 productos con tu lista: nombres, precio por unidad y peso.
- Revisar visualmente cada foto: producto correcto, completo, fondo blanco y ausencia de marcas/logos.
- Comprobar las seis subcategorías, buscador, fotos y descripciones en español e inglés, en pantalla grande y celular.
- Ejecutar pruebas de validación, conservación de metadatos y protección contra duplicados.
- Verificar que los ocho existentes mantengan sus datos y que “Dónde comprarlo” no aparezca al público.
- Si no hay sesión de admin autorizada, informar la comprobación de edición como pendiente, sin saltarse permisos.
- Entregar lista corta: cuántos se añadieron y cuáles quedaron sin foto.

## Límites
**No publicar, no tocar Stripe, checkout, propinas ni datos de usuarios/clientes.** No cambiar envíos ni activar lotes.

## Detalles técnicos
- Ampliar las subcategorías compartidas y su validación por categoría, conservando las existentes de frutas y carnes.
- Reutilizar el selector del admin y el filtro público actuales, con traducciones ES/EN.
- Añadir catálogo verificable y pruebas; almacenar cada foto individualmente con el flujo actual de imágenes.
- Aplicar una migración limitada al catálogo: ampliar la restricción de subcategorías, insertar los nuevos productos y sus datos de compra con guardas contra duplicados, clasificar los ocho existentes y actualizar solo las dos fotos faltantes autorizadas.
- No crear tablas ni cambiar permisos ajenos al catálogo. Actualizar las reglas estructurales y tareas del proyecto si corresponde.

## Aprobación
Este cambio requiere más de tres archivos y una migración del catálogo. **Se aplicará únicamente después de tu OK al plan.**