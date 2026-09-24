# Zonas como grupos de códigos postales y días iguales para todos

## 1. Días de entrega globales
- Lunes, miércoles y viernes para TODAS las zonas. Se siguen editando en /admin/precios ("Días de entrega").
- Se quitan los días por zona: en "Zonas de entrega" ya no aparecen botones de días. El cliente siempre ve los días generales (se mantiene la hora límite).

## 2. Zonas = grupos de códigos postales
- Cada zona acepta códigos completos (11434) o prefijos de 3 dígitos (112 = todo lo que empieza con 112).
- Zonas iniciales:
  - Manhattan: 100, 101, 102
  - Bronx: 104
  - Staten Island: 103
  - Brooklyn: 112
  - Queens: 110, 111, 113, 114, 116
- Se pueden editar, borrar o agregar más (también fuera de NYC).
- Si un código coincide con un código completo y con un prefijo, gana el más específico.
- Código postal sin zona: se acepta normal y aparece en el grupo **"Otras áreas"**. Ya no sale "Sin zona — asignar a mano".

## 3. El repartidor elige qué llevarse
- En "Pedidos de tienda" ve TODOS los pedidos disponibles del día (y atrasados), agrupados por **zona** y dentro por **código postal**.
- Cada grupo muestra: cantidad de pedidos, peso total y cuánto gana en total.
- Botón por pedido "Tomar pedido" y por código postal "Tomar los 5 pedidos de 11434".
- "Mis zonas" pasa a ser **zonas favoritas**: solo las ordena primero, no bloquea nada. También en el formulario de /repartidores (texto explicativo actualizado).
- Se mantiene: más de 45 lb solo con auto (esos pedidos no se le muestran al que no tiene auto), y nadie puede tomar un pedido que ya tomó otro. Si al tomar un grupo alguno ya lo tomó otro, se toman los demás y se avisa cuántos no se pudieron.

## 4. Tienda y admin
- Panel de la tienda (pedidos) y /admin/pedidos-tienda: pedidos agrupados por zona y luego por código postal, con "Otras áreas" al final.

## Lo que no se toca
Checkout de galletas, cobros al cliente, tabla de usuarios/clientes. No se publica. Sigue en modo prueba de Stripe.

## Detalles técnicos
- **Migración**:
  - `claim_store_order`: se quita la condición "zip ∈ zonas del repartidor"; se mantienen aprobado, >45 lb solo auto y UPDATE atómico `WHERE estado='listo' AND repartidor_id IS NULL`.
  - Trigger de validación de `delivery_zones`: aceptar entradas de 3 a 5 dígitos; evitar la misma entrada exacta en dos zonas.
  - `route_days` se deja sin uso (no se borra la columna; default `{}`).
  - Insertar las 5 zonas iniciales (`ON CONFLICT (name) DO NOTHING`).
- **Código**:
  - `pricing.ts`: `zoneForZip(zones, zip)` con coincidencia exacta > prefijo; `daysForZip` eliminado del flujo (siempre días globales).
  - `store-checkout.functions.ts` y `tienda.$slug.tsx`: validar/mostrar solo días globales.
  - `admin.precios.tsx` (ZonesEditor): sin días, acepta prefijos.
  - `store-delivery.functions.ts`: `listDriverStoreOrders` devuelve todos los disponibles con `zona`/`favorita`; nuevo `claimStoreOrderGroup` (llama `claim_store_order` por cada id); admin agrupado con "Otras áreas".
  - `repartidor.tienda.tsx`: grupos zona → zip con totales y botón de grupo; favoritas primero.
  - `negocios.pedidos.tsx`, `admin.pedidos-tienda.tsx`: agrupación zona → zip.
  - `repartidores.tsx`: texto de zonas favoritas. Traducciones es/en.
