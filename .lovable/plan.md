# Volver a libras en toda la tienda

Cambiamos el peso de kilos a libras en el catálogo, el carrito, el cobro y el panel de administrador.

## Valores equivalentes (los mismos precios de hoy, solo en libras)

- Peso incluido: 45 lb (antes 20 kg)
- Cargo extra: $0.68 por libra que pase de 45 lb (antes $1.50 por kilo)
- Peso máximo por pedido: 120 lb (antes 55 kg)
- Peso por defecto de un producto: 1 lb (antes 0.5 kg)

Todos siguen siendo editables desde /admin/precios.

## Qué se ve

- Carrito de la tienda: "Tu pedido pesa X lb de 45 lb incluidas", aviso de máximo 120 lb.
- Panel del negocio: el campo del producto vuelve a decir "Peso (lb)".
- /admin/precios: libras incluidas, precio por libra extra, peso máximo y peso por defecto.
- El cliente sigue viendo un solo precio de entrega (tramo + peso), sin desglose.

## Datos

- Los pesos de los productos se convierten de vuelta a libras (1 kg = 2.2046 lb), sin perder nada.
- Los ajustes de precios se actualizan a los valores de arriba.
- No hace falta cambiar la estructura de la base de datos: las columnas de libras ya existen.
- No se toca el checkout de galletas, ni pagos, ni usuarios.

## Detalle técnico

- `src/lib/pricing.ts`: `weightIncludedLb`, `weightExtraPerLbUsd`, `weightMaxLb`, `defaultProductWeightLb`, `cartWeightLb`, `weightFeeCents`.
- `store-checkout.functions.ts` y `store-orders.functions.ts`: cálculo y recálculo con `peso_lb` / `peso_total_lb`.
- `store.functions.ts`, `negocios.panel.tsx`, `tienda.$slug.tsx`, `admin.precios.tsx`: campos y textos en libras.
- Las columnas `peso_kg` / `peso_total_kg` quedan sin uso (no se borran).
- Sin publicar; typecheck al final.
