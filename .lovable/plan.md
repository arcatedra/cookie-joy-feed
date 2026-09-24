# Zonas por barrio con códigos postales completos

## Qué cambia
- Se reemplazan las 5 zonas por prefijo (Manhattan 100, Brooklyn 112…) por **42 zonas por barrio**, cada una con sus códigos de 5 dígitos, exactamente como en tu lista.
- Cada zona muestra su **condado/borough** (Queens, Brooklyn, Manhattan, Bronx, Staten Island).
- Ya no se aceptan prefijos de 3 dígitos: solo códigos completos de 5.
- Días de entrega: siguen siendo globales (lunes, miércoles y viernes) para todas.
- En Precios → "Zonas de entrega": se ve la lista agrupada por borough; al crear o editar una zona se elige el borough (o se escribe otro, para zonas fuera de NYC más adelante).

## Repartidor, tienda y admin
- "Pedidos de tienda" del repartidor: agrupados **borough → zona → código postal**, con cantidad, peso y ganancia en cada nivel, y botón para tomar todo un código postal.
- Tienda y admin: la misma agrupación borough → zona → código postal.
- Códigos que no estén en ninguna zona: grupo **"Otras áreas"** al final.
- Se mantiene: más de 45 lb solo con auto, y nadie toma un pedido ya tomado.

## A tener en cuenta
- Al borrar las 5 zonas viejas, se pierden las "zonas favoritas" que algún repartidor hubiera marcado (hoy no hay repartidores, así que no afecta a nadie).

## Lo que no se toca
Checkout de galletas, cobros, tabla de usuarios/clientes. No se publica.

## Detalles técnicos
- **Migración**: `delivery_zones.borough text not null default ''`; trigger de validación acepta solo `^\d{5}$` y evita el mismo código en dos zonas.
- **Datos** (run_sql): borrar las 5 zonas de prefijo e insertar las 42 zonas con su borough.
- **Código**:
  - `pricing.ts`: `zoneForZip` solo coincidencia exacta; `groupByZoneZip` pasa a borough → zona → zip ("Otras áreas" al final).
  - `pricing.functions.ts`: zoneSchema con `borough` y zip `^\d{5}$`.
  - `admin.precios.tsx`: campo borough y lista agrupada.
  - `store-delivery.functions.ts`, `repartidor.tienda.tsx`, `negocios.pedidos.tsx`, `admin.pedidos-tienda.tsx`: nivel borough extra.
  - Traducciones es/en.
