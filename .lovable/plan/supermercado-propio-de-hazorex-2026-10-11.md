# Supermercado propio de Hazorex

Hazorex funciona como una tienda propia: tú subes los productos, el cliente paga en Hazorex y tú compras en el súper. No se publica. No se toca Stripe, propinas ni datos de clientes.

## 1. Admin: /admin/productos (solo administradores, revisado en el servidor)
- Enlace "Productos del supermercado" en el menú admin de /profile.
- Tabla con buscador, filtro por categoría y cambios rápidos de precio, stock, oferta y ocultar/mostrar.
- "Agregar producto": nombre ES/EN, categoría, foto, precio, precio anterior (oferta), tamaño (ej. 16 oz), peso en lb (obligatorio), por unidad o por libra, disponible sí/no, y "Dónde comprarlo" (súper + dirección).
- "Dónde comprarlo" se guarda aparte: solo lo ven el admin y el repartidor del pedido, nunca el cliente.
- "Subir en bloque": CSV o Excel, con plantilla para descargar. Antes de guardar te muestra las filas con error.

## 2. Cliente: /supermercado ("Supermercado" en el menú principal)
- Barra de categorías: Frutas y verduras, Carnes y mariscos, Lácteos y huevos, Panadería, Congelados, Despensa, Bebidas, Snacks, Limpieza, Cuidado personal, Bebé, Mascotas.
- Buscador y filas que se deslizan: Ofertas, Más vendidos (según pedidos reales) y una fila por categoría.
- Tarjeta: foto, precio grande, precio tachado y % de descuento si está en oferta, nombre, tamaño y "+ Agregar", que cambia a "− 1 +".
- Productos por libra: "precio estimado" y "el total final se ajusta al peso real".
- Reemplazo para cada pedido: producto similar / no reemplazar / llamarme.
- Todo en español e inglés, con los colores de Hazorex y pensado para celular.

## 3. Carrito y pago
- Muestra el peso total en lb y la entrega con las reglas de /admin/precios (hasta 15 lb $12, hasta 30 lb $25, hasta 45 lb $39.99, $0.80 por lb extra, sin cargo de servicio).
- Propina opcional y el mismo pago con Stripe que ya usan las tiendas, sin cambiarlo.
- Al pagar, el pedido aparece en "Pedidos de tienda" como "Hazorex Supermercado". Ahí cambias el peso real o las cantidades, como hoy.

## 4. Diez productos de prueba (Dónde comprarlo: Food Bazaar)
Aguacate Hass, guineos, uvas verdes, fresas Driscoll's, calabaza kabocha, pimiento amarillo, agua Poland Spring 24 pk, Schweppes Ginger Ale 12 pk, jugo Apple & Eve 64 oz y Red Bull sin azúcar 4 pk, con los precios, pesos y categorías que diste. Las fotos serán genéricas, creadas para Hazorex. No se copian de Instacart.

## Un punto que debes saber
El pago que ya existe le transfiere su parte a la tienda por Stripe. Como esta tienda es Hazorex, no tendrá cuenta conectada: el dinero de los productos se queda en tu cuenta de Stripe y esa transferencia simplemente no se hace. No cambia nada en Stripe.

## Base de datos (cambio que necesita tu OK)
- Se crea la tienda "Hazorex Supermercado" (aprobada, a nombre de tu cuenta de admin) con las 12 categorías.
- Productos: se agregan campos para nombre en inglés, precio anterior, tamaño, venta por libra, stock y orden.
- Nueva tabla privada "dónde comprarlo": solo la leen el admin y el repartidor asignado.
- En los pedidos de tienda se agrega la opción de reemplazo.
- Nueva carpeta de fotos de productos: todos pueden verlas y solo el admin puede subirlas.
- Solo se agregan cosas: no se borra nada y no se tocan usuarios ni clientes.

## Detalle técnico
- Migración: columnas `nombre_en`, `precio_anterior`, `tamano`, `vendido_por_lb`, `stock` en `store_products`; tabla `store_product_sourcing(product_id, super, direccion)` con RLS solo para admin y repartidor asignado; `store_orders.reemplazo`; `businesses.is_house` para la tienda propia.
- `src/lib/house-store.functions.ts`: listado público, CRUD admin con `has_role`, importación en bloque validada con zod; Excel leído con `xlsx` en el navegador.
- Rutas: `admin.productos.tsx` (en _authenticated), `supermercado.tsx`; enlaces en `profile.tsx` y el menú principal.
- El carrito usa el carrito y checkout de tienda que ya existen (`tienda.$slug` / `store-checkout.functions.ts` solo recibe el valor de reemplazo, sin cambiar el cobro).
- Fotos generadas y guardadas en almacenamiento; los datos de prueba se cargan después de la migración.
- Pruebas: entrega por peso del carrito, validación del CSV y RLS de "dónde comprarlo".
