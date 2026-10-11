# Frutas del Supermercado Hazorex

## Cambios propuestos
- Añadir las **43 frutas** recibidas, incluyendo el aguacate dominicano del primer mensaje, con los nombres ES/EN, precios, venta por unidad o libra y pesos aproximados indicados.
- Guardar **Food Bazaar** como lugar de compra, visible únicamente para administrador y repartidor autorizado. No inventar su dirección.
- No duplicar ni reemplazar aguacate Hass, guineos, uvas verdes o fresas existentes. El **guineo verde** será un producto distinto.
- Crear una foto propia por producto: fruta genérica realista, completa y centrada sobre fondo blanco cuadrado, con margen y estilo uniforme. Sin marcas, etiquetas, logos ni imágenes copiadas de tiendas. Para frutas cortadas y ensalada, mostrar la preparación correspondiente; para bolsas o cantidades indicadas, usar presentación neutra sin marca.
- Escribir y guardar una descripción original de una línea en español y otra en inglés, y mostrarlas según el idioma elegido.
- Añadir **Frutas** y **Verduras** dentro de **Frutas y verduras**, disponibles para filtrar en el supermercado y elegir al editar productos. Clasificar las frutas existentes como Frutas y kabocha/pimiento como Verduras, conservando sus fotos y precios.

## Precios por libra
- Mantener el cálculo existente de porción estimada: precio por libra × peso aproximado. Por ejemplo, Manzana Gala: $1.56/lb × 0.4 lb ≈ $0.62 por porción.
- No cambiar las tarifas de entrega, el carrito, Stripe ni las propinas.

## Comprobaciones
- Verificar los 43 nombres, precios, pesos, unidades y descripciones ES/EN; comprobar que no hay duplicados.
- Revisar cada foto para confirmar fruta correcta, fondo blanco y ausencia de marcas o cortes involuntarios.
- Comprobar búsqueda y filtros Frutas/Verduras, presentación en teléfono y computadora, y selección de productos sin iniciar pagos.
- Ejecutar las pruebas relacionadas y comprobar que la vista previa no presenta errores. Informar cualquier limitación de acceso al administrador.

## Detalles técnicos
- Reutilizar el catálogo, la categoría existente y las reglas de precio por libra; añadir únicamente los campos de catálogo necesarios para subcategoría y descripción inglesa, conservando la descripción española existente.
- Actualizar la lectura pública, el formulario del administrador, la validación y las pantallas de productos para conservar y mostrar esos campos. Mantener las restricciones de acceso existentes.
- Cargar los productos mediante una migración con filas explícitas y protección contra duplicados. Guardar las imágenes propias en el almacenamiento de medios utilizado por la aplicación.
- El cambio afecta a más de tres archivos y requiere una migración; se aplicará **solo después de tu aprobación**.

## Límites
**No publicar, no efectuar cobros, no modificar Stripe ni propinas, y no modificar ni borrar usuarios/clientes.** Los productos existentes conservarán fotos, precios e historial.