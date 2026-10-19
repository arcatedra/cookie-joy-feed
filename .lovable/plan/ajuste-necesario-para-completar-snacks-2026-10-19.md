# Ajuste necesario para completar Snacks

El plan aprobado contó 78 productos por error: tu lista contiene **67 productos nuevos**, más la corrección del Cheez-It original de 7 oz a **$4.19**. Se cargarán exactamente los productos de tu lista, sin inventar los restantes.

## Autorización adicional necesaria
La base de datos admite únicamente las subcategorías anteriores y rechazaría las siete nuevas de Snacks. Hace falta ampliar esa lista de valores permitidos.

- Añadir a la validación las siete subcategorías solicitadas: Papas y chips, Galletas saladas, Galletas dulces, Chocolates y dulces, Barras y frutos secos, Palomitas y pretzels y Carne seca.
- Conservar todas las subcategorías existentes y todos los datos. No borrar tablas, columnas ni productos.
- Continuar con el resto del plan ya aprobado: 67 productos con precios regulares, fotos propias u Open Food Facts, códigos para el escáner solo cuando coincida el tamaño, pruebas y revisión en celular/computadora.
- No tocar pagos, Stripe, propinas, entrega, usuarios/clientes ni publicar.

## Detalle técnico
Migración limitada a ampliar la validación `store_products_subcategoria_valid` de `store_products`. Se preservan los valores actuales y se comprueba que las siete nuevas subcategorías se aceptan y que valores ajenos siguen rechazándose.
