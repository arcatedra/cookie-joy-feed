Entiendo la contradicción: el sistema hoy está metiendo dinero al bote con las compras, pero esas compras no se están convirtiendo automáticamente en participantes del sorteo diario. Por eso puede existir $1.98 en el bote y aun así el sorteo del día marcar 0 participantes.

Plan para corregirlo:

1. Cambiar la lógica del webhook de pagos de Estrellas
   - Cuando una compra de Estrellas se complete y aporte al bote, además de registrar el dinero, crear automáticamente una entrada en `daily_draw_entries` para el sorteo del día de Nueva York.
   - La entrada usará el comprador real: usuario/email y un nombre visible seguro.
   - Será idempotente para evitar entradas duplicadas si el webhook se reintenta.

2. Asegurar que el sorteo entregue el bote si hay al menos una entrada
   - Mantener la regla correcta: si `tickets_total > 0`, se selecciona ganador y se crea el reclamo del premio.
   - Solo permitir rollover cuando realmente no haya ninguna entrada.

3. Corregir el caso actual pendiente
   - Revisar las compras completadas que ya aportaron al bote pero no tienen entrada del sorteo.
   - Crear las entradas faltantes para que el próximo procesamiento del sorteo pueda entregar el premio a uno de esos participantes.

4. Validar el resultado
   - Verificar en base de datos que las compras completadas tienen entradas asociadas.
   - Verificar que el sorteo ya no quede con bote acumulado y 0 participantes cuando hubo compras pagadas.

Detalle técnico:
- Archivos principales: `src/routes/api/public/payments/webhook.ts` y, si hace falta, una migración pequeña para una restricción/índice idempotente.
- No tocaré otros flujos no relacionados ni cambiaré el porcentaje del bote.