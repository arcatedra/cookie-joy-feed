## Objetivo

Crear una ruta pública `/demo` donde puedas probar los 4 componentes nuevos aislados, sin necesidad de tener carrito real, entregas agendadas ni rol admin.

## Qué vas a ver en `/demo`

Una sola página con 4 tarjetas apiladas, cada una con su propio estado local (nada toca la base de datos):

1. **Peso del carrito (`CartWeightTracker`)**
   - Carrito simulado editable: 3 items con botones +/− para cambiar cantidades en vivo.
   - Ves la barra cambiar de verde → ámbar → rojo, el aviso "por poco" y el cálculo de entregas extra.

2. **Propina (`TipSelector`)**
   - Toggle "hay escaleras" para ver cómo cambia la sugerencia.
   - Muestra debajo el valor elegido y el método de pago seleccionado en JSON, así ves qué llega al `onChange`.

3. **Chat de delivery (`DeliveryChat`)**
   - Montado inline (no como botón flotante) para verlo siempre.
   - Mensajes locales, sin backend.

4. **Prueba de entrega (`ProofOfDelivery`) — modo demo**
   - Wrapper que intercepta el `onSubmit`: muestra la foto elegida y la descripción en pantalla en lugar de subir a Storage o llamar al server function.
   - Así podés probar el flujo de cámara/preview sin necesitar rol admin ni una reserva real.
   - Nota visible: "Modo demo — no se guarda nada". El flujo real sigue viviendo en `/admin/deliveries`.

## Detalles técnicos

- **Archivo nuevo:** `src/routes/demo.tsx` (ruta pública, no bajo `_authenticated`).
- **`head()`:** título "Demo de componentes" + `robots: noindex` para que no se indexe.
- **Sin cambios** en los componentes existentes ni en el backend.
- **Sin cambios** en `ShopifyCartDrawer`, `/deliveries` ni `/admin/deliveries` — siguen funcionando igual.
- Layout: contenedor centrado `max-w-2xl`, cada sección en un `Card` con título y descripción corta de qué probar.

## Fuera de alcance

- No se agrega seed data ni se te asigna rol admin (podemos hacerlo después si querés).
- No se toca lógica de negocio ni RLS.
