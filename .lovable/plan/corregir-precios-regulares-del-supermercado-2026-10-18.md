# Corregir precios regulares del supermercado

- Aplicar los 43 precios únicos indicados, conservando la venta por unidad o libra de cada producto.
- Para los mismos registros de frambuesas y moras Driscoll’s de 6 oz, usar los precios confirmados: $6.99 y $5.69.
- Cambiar únicamente el precio de productos existentes; conservar nombres, fotos, pesos y todos los demás productos.
- Guardar la regla permanente: precio regular de Food Bazaar, nunca precio de oferta, sin sobreprecio.
- No tocar pagos, propinas, entrega ni usuarios/clientes; no publicar.

## Comprobaciones
- Verificar cada precio en el catálogo y conservar los identificadores existentes.
- Confirmar que no cambiaron fotos, nombres, modalidades ni productos fuera de la lista.
- Probar los precios y revisar su visualización sin iniciar pagos; informar cuántos cambiaron.

## Detalles técnicos
Actualizar únicamente `store_products.precio`, con guardas por identificador, nombre y precio previo. Sin cambios de estructura. Sincronizar referencias de catálogo y sus pruebas existentes (más de tres archivos, por eso se solicita aprobación).