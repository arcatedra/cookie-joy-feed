# Supermercado > Bebé

Para esta sección hay que hacer un cambio pequeño en la base de datos: la lista de subcategorías permitidas no incluye las de Bebé. Según tus reglas, necesito tu OK antes de hacerlo.

## Qué voy a hacer
1. **Agregar las 11 subcategorías nuevas** a la lista de permitidas, sin borrar ni cambiar nada de lo que ya existe: Pañales por talla, Pañales de entrenamiento, Toallitas húmedas, Fórmula infantil, Compotas y papillas, Cereales y snacks para bebé, Biberones, chupetes y accesorios, Baño y cuidado del bebé, Cremas para el pañal, Leche y bebidas para niños, Salud del bebé sin receta.
2. **Cargar los productos de uso normal de Bebé** que vende Food Bazaar (unos 100 a 120):
   - Precio regular de Food Bazaar. Si el producto está en oferta, pongo el precio de antes. Si no aparece en la tienda, uso el precio regular de Instacart.
   - Sin sobreprecio y vendido por unidad o paquete.
   - Nombre con la marca al principio, descripción corta en español e inglés y tamaño.
   - En los pañales: la talla y la cantidad.
   - Varias marcas por producto, sin duplicados.
   - Nada que pida receta o licencia.
3. **Fotos:**
   - Si el producto trae código de barras (UPC), busco su foto en Open Food Facts u Open Beauty Facts y le pongo el crédito.
   - Si no, reutilizo la foto de un producto parecido del catálogo.
   - Si tampoco hay, creo una foto propia con la marca, variante, talla y tamaño exactos de la tarjeta.
   - Reviso cada foto, una por una.
4. **Comprobar en la vista previa**, en celular y en computadora, que cargan todas las fotos.

## Fotos de Snacks (ya resuelto)
Las fotos de Goldfish Colors, Ritz Handi-Snacks y Club Multigrano ya quedaron corregidas en el arreglo anterior. No hace falta hacer nada más.

## Lo que no toco
Pagos, entrega, clientes, precios de otras secciones. No publico.

## Detalles técnicos
- La migración reemplaza la regla `store_products_subcategoria_valid` por la misma lista más las 11 subcategorías de Bebé.
- Se agregan las mismas subcategorías a las reglas del catálogo en `src/lib/house-store-rules.ts`.
- Se crea el catálogo de Bebé siguiendo el mismo patrón de las otras secciones.
- Se agrega una prueba que comprueba las 11 subcategorías de Bebé.
