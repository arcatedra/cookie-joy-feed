# Carnes y mariscos del Supermercado Hazorex

## Qué se añadirá
- **64 productos nuevos** con los nombres ES/EN, precios, venta por unidad o libra y pesos aproximados que indicaste:
  - Pollo y pavo: 14.
  - Res: 14.
  - Cerdo: 9.
  - Cordero y chivo: 3.
  - Pescado: 14.
  - Mariscos: 10.
- Las seis subcategorías estarán disponibles en **/supermercado** y al agregar o editar productos en **/admin/productos**, igual que Frutas y Verduras.
- Cada producto tendrá una descripción corta propia en español e inglés y una **foto individual propia**, realista, centrada sobre fondo blanco, sin empaques, marcas ni logos. Los productos ahumados o salados se representarán con su aspecto correspondiente.
- “Dónde comprarlo”: **Food Bazaar**, sin inventar dirección y visible únicamente para admin y repartidor autorizado.
- Se conservarán los cinco productos de marca existentes, sus precios y sus fotos. No se duplicarán ni se reemplazarán. Tampoco se cambiarán las frutas y verduras.

## Cómo se comprobará
- Revisar los 64 nombres ES/EN, precios, pesos y unidades contra tu lista, y evitar duplicados tanto en español como en inglés.
- Revisar que cada foto corresponda al corte o especie y se vea completa; corregir imágenes incorrectas antes de cargar el catálogo.
- Comprobar buscador, filtros por las seis subcategorías, descripciones ES/EN y fotos sin errores.
- Probar que el admin pueda conservar y editar las subcategorías, sin perder metadatos al omitir campos; si no hay sesión autorizada, indicar esa prueba como pendiente.
- Entregar una lista corta con cuántos se añadieron y cuáles quedaron sin foto, si alguno.

## Límites
**No publicar, no tocar Stripe, checkout, propinas ni datos de usuarios/clientes.** No cambiar tarifas ni activar el modelo de lotes.

## Detalles técnicos
- Ampliar el campo de subcategoría existente y su validación por categoría, conservando Frutas/Verduras y metadatos omitidos al editar.
- Ajustar el selector del admin y el filtro público con las traducciones correspondientes; mantener el catálogo compartido entre las vistas.
- Incorporar una definición verificable del nuevo catálogo y pruebas automáticas. Guardar cada foto por separado en el almacenamiento utilizado por el catálogo.
- Aplicar una migración limitada al catálogo: ampliar la restricción de subcategorías e insertar literalmente los 64 productos y sus datos de compra con protección contra duplicados. No crear tablas de usuarios ni modificar permisos ajenos al catálogo.
- Registrar la regla estructural de subcategorías por categoría en AGENTS.md y actualizar la lista de tareas.

## Aprobación
Este cambio requiere modificar más de tres archivos y ampliar la validación del catálogo en la base de datos. **Se aplicará únicamente después de tu OK al plan.**