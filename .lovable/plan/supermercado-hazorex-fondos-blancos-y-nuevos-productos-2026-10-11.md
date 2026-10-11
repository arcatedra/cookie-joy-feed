# Supermercado Hazorex: fondos blancos y nuevos productos

## Fotos limpias
- Revisar las fotos actuales que tienen origen verificado en Open Food Facts. Las frutas y verduras, incluidas las fresas, se quedan como están.
- Quitar el fondo de cada foto elegible y centrar el producto entero en un cuadrado blanco con margen. No cambiar proporciones, etiqueta, colores ni presentación.
- Guardar cada versión nueva en nuestro almacenamiento y conservar su original con una referencia recuperable.
- Comparar cada resultado con el original. Si cambia la etiqueta, corta el producto o deja un recorte feo, mantener el original y señalar el caso; no repetir ediciones de pago sin consultarte.
- Mostrar en las fotos modificadas: “Foto: Open Food Facts (CC BY-SA), fondo editado”. Mantener el crédito normal en originales y actualizar la línea del pie para distinguirlos.

## Nuevos productos
Agregar 13 productos, en español e inglés, por unidad, sin precios tachados ni ofertas inventadas. “Dónde comprarlo”: Food Bazaar, sin inventar dirección; solo visible para admin/repartidor autorizado.

| Lácteos y huevos | Precio | Peso |
|---|---:|---:|
| Queso mozzarella rallado Kraft 8 oz | $7.02 | 0.5 lb |
| Queso cheddar rallado Kraft 8 oz | $7.02 | 0.5 lb |
| Queso crema Philadelphia 8 oz | $7.13 | 0.5 lb |
| Queso mozzarella Polly-O 16 oz | $9.44 | 1 lb |
| Crema batida Reddi-wip 6.5 oz | $6.08 | 0.5 lb |
| Leche entera Organic Valley 64 fl oz | $8.91 | 4.3 lb |
| Leche entera sin lactosa Fairlife 52 fl oz | $9.12 | 3.5 lb |
| Huevos grandes 12 unidades | $10.17 | 1.6 lb |

| Carnes y mariscos | Precio | Peso |
|---|---:|---:|
| Tocino Oscar Mayer 16 oz | $16.05 | 1 lb |
| Tocino de pavo Butterball 12 oz | $5.24 | 0.75 lb |
| Salchichas de res Sabrett 14 oz | $9.44 | 0.9 lb |
| Salchicha ahumada Hillshire Farm 12 oz | $9.54 | 0.75 lb |
| Pavo molido Butterball 16 oz | $7.34 | 1 lb |

- Buscar únicamente fotos frontales de Open Food Facts que coincidan con marca, variedad y tamaño; descargar los originales y preparar el mismo fondo blanco.
- Guardar código de barras verificado, fuente y licencia; no inventar códigos.
- Sin coincidencia exacta, conservar una foto existente si la hay. Como estos productos son nuevos, si no hay foto previa usar un marcador neutro y avisarte. Los huevos no tienen marca indicada: no inventar una marca ni usar un envase de marca como si fuera el producto confirmado.
- Las dos categorías ya existen: sus filas aparecerán cuando tengan productos, sin crear páginas adicionales.

## Comprobaciones
- Revisar producto completo, márgenes, etiquetas y colores en cada foto; entregar lista de fondos blancos y excepciones.
- Comprobar los 29 productos esperados, precios, pesos, categorías y ausencia de duplicados.
- Verificar que todas las fotos se sirven desde almacenamiento propio, que los originales siguen disponibles y que el crédito correcto se conserva al editar precio o stock.
- Probar búsqueda, categorías y visualización en celular/computadora, además de las pruebas pertinentes del catálogo. Indicar cualquier comprobación de admin bloqueada por falta de sesión autorizada.

## Cambios que requieren tu OK
Este trabajo modifica varios archivos y necesita una migración del catálogo para conservar la referencia de la foto original y distinguir las fotos con fondo editado, además de cargar los 13 productos.

## Detalle técnico
- Migración aditiva limitada al catálogo de `hazorex-supermercado`: referencia de original y marca de edición, con inserciones explícitas de los 13 productos sin duplicarlos al repetir la carga.
- Adaptar lectura pública, guardado del admin, crédito compartido y pruebas para preservar los metadatos de la imagen vigente y limpiar los créditos al sustituirla por una foto ajena.
- Editar imágenes existentes con la herramienta de edición, nunca regenerar envases desde cero; almacenar originales y versiones aprobadas por separado.
- Conservar los permisos actuales y la privacidad de `store_product_sourcing`.

## Límites
No publicar, hacer cobros ni modificar Stripe, checkout, propinas, pedidos históricos, usuarios o clientes. Los precios y productos del catálogo podrán afectar compras futuras; no cambian pedidos ya guardados.