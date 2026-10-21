# Entrega de galletas por peso

## Alcance
- Cambiar únicamente el envío de galletas, su carrito y los textos relacionados en español e inglés. No publicar.
- Mantener el mínimo de **$12 en productos**, precios, propinas y la fórmula existente del cargo por procesamiento.
- No modificar Supermercado, tiendas, Pedido especial, referidos, QR, clientes, cuentas de Stripe ni pedidos anteriores.

## Cambios
- Leer la misma tabla de tarifas de `pricing_settings`: hasta **15 lb → $12**, hasta **30 lb → $25**, hasta **45 lb → $39.99**; después sumar el precio configurado por libra excedente.
- Aplicar el mismo peso máximo que el Supermercado. Quitar el límite independiente de cantidad de galletas; el máximo será únicamente por peso.
- Usar el peso guardado de cada producto cuando exista; por defecto **110 gramos por galleta** (aproximadamente 0.243 lb). Los packs y combos sumarán las galletas que incluyen, no contarán como una sola galleta.
- El servidor calculará peso y entrega tanto para el carrito como para confirmar el pago, rechazando presupuestos desactualizados antes del cobro.
- Mostrar peso y entrega correspondiente en el carrito; calcular el cargo existente sobre productos + entrega + propina, respetando el mecanismo actual de saldo.
- Actualizar Términos y cualquier texto de galletas que prometa envío siempre a $12, en ES/EN.

## Verificación limitada
- Una ejecución de pruebas aisladas, sin cobrar: límites de peso, máximo, packs, peso guardado/default, mínimo $12 y cargo sobre la nueva entrega.
- Una comprobación breve del carrito en vista previa, sin iniciar cobros reales.
- Resumen final en cinco líneas con ejemplos de **136 y 20 galletas**. Los totales usarán precios existentes o identificarán explícitamente el precio supuesto del ejemplo; no se cambiarán precios para obtenerlos.

## Detalles técnicos
- Compartir los cálculos actuales de tramos y libras extra sin modificar su comportamiento para otros pedidos.
- Añadir una cotización exclusiva de galletas que consulte precios y pesos fiables en servidor; no aceptar pesos enviados por el navegador como autoridad.
- Reutilizar el mismo cálculo en la creación del pedido. No se prevén migraciones; si falta información fiable para los packs, detener esa parte y comunicarlo antes de ampliar el alcance.
- Trabajo acotado, pero toca carrito, servidor, textos y pruebas; no hay una medición disponible para prometer créditos exactos.