# Corregir cantidades reales de pedidos de tienda

## Problema confirmado
El campo «Real» de «Pedidos de mi tienda» se envía, pero el cálculo del cobro lo descarta. Una reproducción aislada confirmó que, con 3 unidades pedidas y 2 disponibles, se siguen calculando 3. La pantalla de escaneo tampoco permite guardar cantidades parciales.

El bloqueo cuando faltan artículos por revisar es correcto y se mantendrá: escribir una cantidad no sustituye la verificación del producto.

## Cambios propuestos
- Hacer que «Real» determine la cantidad de productos por unidad efectivamente entregada, después de verificar cada artículo.
- Permitir guardar cantidades parciales también en «Comprar y escanear», para que tienda, administrador y repartidor asignado compartan el mismo resultado.
- Reutilizar el campo de cantidad real existente: no agregar ni borrar tablas o campos.
- Conservar «No había» como cantidad cero y usar el peso registrado para productos por libra; no permitir que un número escrito sobrescriba ese peso.
- Validar cantidades finitas, no negativas y no superiores a las pedidas para productos por unidad; rechazar artículos ajenos al pedido y entradas duplicadas antes de guardar o cobrar.
- Mostrar y enviar las cantidades guardadas en ambas pantallas. Al deshacer una revisión, limpiar su cantidad para evitar reutilizar un resultado anterior.
- Comprobar errores al guardar y detener el cobro si las cantidades no se pudieron guardar.

## Pruebas
- Pedido de 3 unidades, entrega de 2: calcular y guardar 2, no 3.
- Cantidad completa, cantidad cero y reemplazo parcial.
- Rechazar cantidades inválidas, superiores a lo pedido, artículos ajenos y entradas duplicadas.
- Mantener el bloqueo de artículos pendientes y el cálculo por peso real.
- Verificar que ambos caminos de preparación usan la misma cantidad y que un reintento la conserva.
- Ejecutar pruebas con pagos simulados, sin cargos ni transferencias reales. Revisar las pantallas autenticadas solo si hay acceso autorizado; indicar cualquier comprobación que no se pueda completar.

## Detalles técnicos
Cambios limitados a las reglas compartidas y sus pruebas, las funciones de preparación/cálculo y las dos pantallas afectadas. Actualizar la regla correspondiente de arquitectura y esta tarea en el listado de pendientes. No modificar la integración de Stripe: corregir únicamente las cantidades que alimentan el cálculo existente, manteniendo su límite de reserva y protección contra cobros duplicados.

## Límites
Sin publicar, sin modificar usuarios/clientes, sin cambiar propinas, tarifas de envío ni checkout de galletas. Los lotes seguirán apagados. No marcar el aviso como corregido hasta implementar y verificar la solución.

**Se requiere tu aprobación porque esta corrección cambia el importe usado para cobrar y afecta más de tres archivos.**