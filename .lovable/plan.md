# Ajustes visuales del supermercado y la portada

## Cambios
1. **Supermercado:** sustituir el panel que tapa los productos por una barra pequeña «N productos · $importe · Ver carrito». El importe será el subtotal real de productos, con el cálculo existente para artículos por libra; entrega y propina seguirán detalladas dentro del carrito.
2. **Carrito deslizable:** al pulsar la barra, abrir el panel actual en una hoja con cierre visible, desplazamiento interno y tamaño adecuado en celular y computadora. Conservar fecha, propina y demás selecciones al cerrar y volver a abrir. No cambiar el funcionamiento del pago.
3. **Portada:** añadir una cuarta tarjeta «Supermercado» con cuatro fotos ya existentes (Frutas y verduras, Carnes, Lácteos y Panadería), enlace a /supermercado y «Precios de tienda, sin sobreprecio». Distribuir las cuatro tarjetas sin huecos en pantallas pequeñas y grandes.
4. **Ofertas:** mostrar hasta cuatro galletas del catálogo actual, priorizando ofertas verificables si existen y completando con destacados sin descuentos inventados ni precios fijos de ejemplo.
5. **Sin franjas vacías:** eliminar la sección vacía y colocar antes del pie «Cómo funciona»: Pides el día antes; Compramos y preparamos tu pedido; Te lo entregamos lunes, miércoles o viernes.

## Comprobaciones
- Añadir productos, comprobar cantidad e importe, abrir y cerrar el carrito y conservar sus selecciones.
- Verificar fotos, cuatro tarjetas, destacados y sección final en celular y computadora, sin solapamientos ni desplazamiento horizontal.
- No pulsar Pagar ni hacer cargos reales. No publicar.

## Detalles técnicos
Reutilizar los controles de hoja deslizable y las fotos propias disponibles. Ajustar únicamente la presentación de `StoreCartBar` para /supermercado, dejando otras tiendas con su presentación actual y conservando intactos los cálculos y acciones de pago. Cambiar las dos páginas y la presentación compartida; actualizar el listado de tareas. No realizar migraciones ni modificar usuarios/clientes, precios o funciones de pagos.

**Se requiere aprobación porque se modificarán más de tres archivos, incluido el seguimiento de tareas.**