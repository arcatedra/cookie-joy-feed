# Verificación por código de barras (Supermercado Hazorex)

Sin publicar, sin tocar clientes ni propinas, sin borrar nada en la base de datos (solo se agregan campos).

## Lo que vas a ver

1. **Productos con varios códigos**: en /admin/productos cada producto tiene "Códigos de barras" (solo números, 8 a 14 dígitos, varios por producto). La plantilla de "Subir en bloque" gana la columna `codigos_barras` (separados por `;`). El código actual de cada producto se conserva como su primer código.
2. **Escáner con cámara** en el navegador del teléfono: cámara trasera, botón de linterna (si el teléfono la tiene) y caja para escribir el número a mano si no lee.
3. **Modo enseñar código (solo admin)** en /admin/productos:
   - "Escanear para guardar código": escaneas y eliges el producto; si ese código ya es de otro producto, te avisa y no lo guarda.
   - "Buscar escaneando": si el código existe, abre ese producto para editarlo.
4. **Compra del pedido** (pantalla del comprador: admin o repartidor asignado). Cada artículo tiene estado y botón "Escanear":
   - Coincide → **Encontrado** en verde, con sonido y vibración.
   - No coincide → rojo: "Producto incorrecto, este no es el que pidió el cliente". No se puede marcar encontrado.
   - Producto sin código guardado → se escanea y, si el comprador confirma que es el correcto, se guarda para la próxima vez.
5. **Por libra** (frutas, verduras, carnes): sin escaneo; "Encontrado" + peso real en lb, y el total se recalcula con ese peso.
6. **Si no está**:
   - **Reemplazar**: respeta la preferencia del cliente (similar / no reemplazar / llamarme). El reemplazo también se escanea.
   - **No había**: ese artículo sale del cobro y se avisa al cliente.
7. **"Listo para entregar" bloqueado** hasta que todos los artículos estén Encontrado, Reemplazado o No había.

Todo en español e inglés y pensado para celular.

## Sobre "reembolsar por Stripe" (importante)

Los pedidos de tienda hoy **reservan** el dinero y **cobran lo real** al marcar Listo. Por eso, "No había" no necesita un reembolso aparte: el artículo simplemente no entra en el cobro final (se cobra menos y el resto de la reserva se libera solo). Así no toco nada de Stripe. Si un pedido ya se cobró antes de este paso, no hago reembolsos automáticos y te muestro un aviso para que decidas tú.

## Detalles técnicos

- Migración aditiva:
  - `store_products.codigos_barras text[]` (se rellena con el `codigo_barras` existente) + índice GIN; función para detectar códigos repetidos entre productos.
  - En `store_order_items`: `pick_status` (pendiente/encontrado/reemplazado/no_habia), `scanned_barcode`, `picked_weight_lb`, `picked_at`, `picked_by`, `replacement_product_id`, `replacement_name`.
- Servidor (`*.functions.ts`, validando admin o repartidor asignado): buscar por código, asignar código, escanear artículo, marcar por libra, reemplazar, no había. `markOrderReadyAndCapture` rechaza si quedan pendientes y usa cantidades/pesos reales (no había = 0).
- Escáner: `BarcodeDetector` nativo con respaldo en librería `@zxing/browser`; linterna vía `torch` de la cámara.
- Archivos: house-store-rules, house-store.functions, nuevo picking.functions, componente BarcodeScanner, admin.productos, pantalla de compra (repartidor.tienda / negocios.pedidos), traducciones.
- Pruebas: reglas de códigos (formato, varios, duplicados), bloqueo de Listo, cálculo por libra; Playwright en celular y escritorio ES/EN.
