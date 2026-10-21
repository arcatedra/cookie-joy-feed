# Cargo por procesamiento de pago

## Ajuste autorizado
- Aplicar a nuevos pedidos con tarjeta de galletas, Supermercado, tiendas y Pedido especial, en todos los tramos de peso.
- Mantener tarifas de entrega, precios, pagos a tiendas/repartidores y propina íntegra. No modificar clientes, referidos, QR ni pedidos históricos; no publicar.
- Cargo separado: **Cargo por procesamiento de pago** / **Payment processing fee**.

## Cálculo y cobro
- Calcular únicamente en servidor: base efectivamente pagada con tarjeta (productos + entrega y servicio + propina, descontando cualquier saldo aplicado por el mecanismo existente); cargo = redondeo al centavo de `(base + 0.30) / 0.971 - base`.
- El carrito obtiene el cargo del servidor; no permite pagar mientras el presupuesto esté pendiente o desactualizado. El checkout verifica nuevamente precios y muestra el mismo desglose.
- Galletas: cobro exacto de base más cargo. Tiendas y especiales: incluir cargo antes del margen de reserva existente; respetar el máximo autorizado.
- Al preparar y cobrar, recalcular sobre cantidades/peso reales: artículos no encontrados no se cobran y su parte del cargo tampoco. Si se cancela todo, liberar la reserva sin cobrar cargo.
- No agregar este cargo a fondos de tiendas/repartidores ni a la propina.

## Desglose y textos
- Añadir campos opcionales de cargo y versión del cálculo en pedidos de galletas y tiendas mediante migración aditiva, sin actualizar filas antiguas ni cambiar permisos de clientes.
- Mostrar el cargo guardado en admin e historial; no recalcular cargos de pedidos antiguos.
- Agregar a Términos ES/EN: «Los pagos con tarjeta incluyen un cargo por procesamiento de pago que cubre los costos de la pasarela».

## Verificación limitada
- Una pasada de pruebas aisladas, con Stripe simulado: todos los tramos, galletas, reserva, captura con faltantes, cancelación completa y conservación de pagos a terceros. Sin cobros reales.
- Comprobación breve del desglose público; no afirmar recorrido autenticado verificado si no hay sesión autorizada disponible.
- Ejemplos: base **$27 → cargo $1.12 → total $28.12**; base **$80 → cargo $2.70 → total $82.70**.
- Informar créditos gastados solo si existe una medición disponible; no prometer un costo fijo.

## Detalles técnicos
- Un módulo exclusivamente servidor comparte la fórmula entre presupuesto, creación y ambas rutas de captura; los componentes reciben valores calculados, nunca implementan la fórmula.
- Conservar el mecanismo existente de saldo, las conexiones Stripe, modo integrado y entornos. Proteger pedidos históricos mediante versión nullable del cargo.
- Alcance: funciones de presupuesto/checkout/captura, vistas de carrito/desglose, Términos, migración aditiva y pruebas de reglas. No cambios en catálogo ni tarifas.
- Riesgo principal: inconsistencia entre presupuesto, reserva y captura; validar todos con la misma fórmula y fallar antes del cobro si el presupuesto cambió.