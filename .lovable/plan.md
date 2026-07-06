## Estado del módulo Repartidor

Ya está construido y funcional:
- Onboarding, acuerdo, tutorial, online/offline (`repartidor.onboarding.tsx`, `courier.functions.ts`)
- Aceptar pedidos, recolección, entrega con prueba, cancelación, batching
- Navegación con Google Maps + deep-links Waze/Apple/Google
- Chat con cliente, calificaciones, historial
- Wallet: ganancias por pedido, métodos de pago, payout instantáneo, payout semanal
- Push notifications y tracking en vivo del pedido
- Panel admin (`admin.repartidores`, `admin.deliveries`, `admin.live`)

## Lo único que falta: Facturas / Recibos del repartidor

El repartidor puede ver sus ganancias en `/repartidor/wallet`, pero no puede descargar un **comprobante fiscal / recibo mensual** de sus ingresos para llevar su contabilidad personal. Eso es lo que agregaremos.

### Alcance

1. **Página `/repartidor/facturas`** listando períodos mensuales con:
   - Mes, total bruto, propinas, comisiones descontadas, neto pagado
   - Número de entregas completadas
   - Botón "Descargar PDF" y "Descargar CSV"

2. **Server function `getDriverInvoices`** que agrupa `driver_order_earnings` por mes del repartidor autenticado (últimos 24 meses).

3. **Server function `generateDriverInvoicePDF`** (`method: "POST"`) que genera un recibo mensual con:
   - Datos del repartidor (nombre, teléfono, ID) del `drivers` table
   - Emisor: Hazorex / OriGen (datos de `config.server.ts` o constantes)
   - Detalle línea por línea de pedidos del mes
   - Totales: bruto, propinas, comisión plataforma, neto
   - Número de factura estable: `HZX-{driverId8}-{YYYYMM}`
   - PDF generado con `pdf-lib` (compatible con Worker runtime)

4. **CSV export** del mismo período para contadores.

5. **Entrada en `BottomNav` / wallet** con link a "Mis facturas".

6. **i18n**: claves `driverInvoices.*` en `es/en` (los otros idiomas se completan con el script existente).

### Detalles técnicos

- Archivo nuevo: `src/lib/driver-invoices.functions.ts`
- Ruta nueva: `src/routes/_authenticated/repartidor.facturas.tsx`
- Dependencia: `pdf-lib` (ya edge-compatible, no requiere Node nativo)
- Los "invoices" son documentos derivados de `driver_order_earnings`; no se necesita nueva tabla salvo si el usuario quiere numeración persistente y sellos de tiempo — en ese caso agregar `driver_invoices` (mes, driver_id, totales, generated_at, pdf_path) opcional en fase 2.
- El PDF se genera on-demand y se devuelve como base64 al cliente para descarga (patrón simple, sin storage). Alternativa: subir a bucket `driver-invoices` y devolver signed URL.

### Fuera de alcance

- Facturación fiscal oficial (DGI Panamá / SRI / SAT). Esto es un **recibo interno de ingresos**, no una factura electrónica timbrada. Si quieres factura fiscal oficial (con RUC/timbrado), es un proyecto distinto que requiere integración con proveedor fiscal.

### Pregunta previa a implementar

¿Quieres que el PDF sea solo **recibo de ingresos mensual** (rápido, ~30 min) o quieres además la tabla `driver_invoices` con numeración persistente y almacenamiento en bucket para auditoría (~1h extra)?