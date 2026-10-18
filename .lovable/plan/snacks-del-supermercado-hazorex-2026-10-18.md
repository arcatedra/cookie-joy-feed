# Snacks del Supermercado Hazorex

## Qué se hará
1. **Siete subcategorías nuevas en Snacks**: Papas y chips, Galletas saladas, Galletas dulces, Chocolates y dulces, Barras y frutos secos, Palomitas y pretzels, Carne seca (ES/EN). Se podrán usar en filtros de /supermercado y en /admin/productos.
2. **Corregir el existente**: Cheez-It original 7 oz pasa a $4.19, conservando su foto, nombre y demás datos. Los demás snacks que ya existen se clasifican en su subcategoría sin duplicarlos.
3. **Agregar los 78 productos de tu lista**, con el precio regular de Food Bazaar (0 % de sobreprecio, nunca precio de oferta), venta por unidad o paquete, nombre en español que empieza por la marca, nombre en inglés, descripción corta propia ES/EN, tamaño, peso aproximado y Food Bazaar como lugar de compra (solo lo ven el admin y el repartidor).
4. **Fotos**:
   - Con UPC: se busca en Open Food Facts. Si es el mismo producto y sabor, se usa su foto frontal con fondo blanco y el crédito «Foto: Open Food Facts (CC BY-SA)».
   - El UPC se guarda para el escáner **solo** si el tamaño del paquete coincide.
   - Sin UPC o sin foto válida: foto propia de estilo catálogo sobre fondo blanco, nunca copiada de Instacart, Walmart ni Google.
5. **Antes de duplicar**: no se agrega nada que ya exista con el mismo nombre ES/EN o UPC.

## Qué no se toca
Pagos, Stripe, entregas, propinas, clientes, ni los precios y fotos de las otras secciones. No se publica.

## Comprobaciones
- Pruebas automáticas que confirman los 78 precios, el Cheez-It de 7 oz a $4.19, que cada producto está en su subcategoría y que no hay duplicados.
- Revisión en celular y computadora de /supermercado › Snacks y de los filtros.
- Al final te digo cuántos se agregaron y cuántos quedaron con foto de Open Food Facts.

## Detalles técnicos
- `house-store-rules.ts`: `HOUSE_SNACK_SUBCATEGORIES`, rama en `houseSubcategories` y valores nuevos en el enum de `subcategoria`.
- Un archivo de datos nuevo con las 78 filas y su prueba; los datos se guardan en el catálogo actual sin cambiar la base de datos.
- Las fotos se suben al almacenamiento de fotos de productos ya existente.
