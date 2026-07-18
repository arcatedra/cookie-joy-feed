## Diagnóstico

- `CartProvider` **ya es global y único** (montado en `src/routes/__root.tsx` alrededor de `<Outlet />`) y persiste en `localStorage` bajo `origen.cart.v1`. No hay "carritos duplicados" en código.
- **Botón de `/best-sellers` no agrega** porque llama a `gate.guard(() => cart.add(...))` (`src/routes/best-sellers.tsx:105`). Si el usuario no tiene suscripción activa, `guard` abre el diálogo de suscripción y **no ejecuta** `cart.add`. En cambio, `/shop` llama a `cart.add` directamente (`src/routes/shop.tsx:142`) — de ahí que ahí sí suba el contador. Esa inconsistencia es la causa raíz del bug reportado.
- Persistencia: hay una condición de carrera menor en `src/lib/cart.tsx`. `useState` arranca en `[]`; en el primer mount el `useEffect` de escritura puede correr con `[]` antes de que aplique el `setItems` del `useEffect` de hidratación. Se auto-corrige en la siguiente render, pero conviene endurecerlo para evitar parpadeos de "carrito vacío" tras refresh.

Criterio: "agregar al carrito" debe ser universal en todo el sitio. El `SubscriptionGate` solo debe intervenir en el checkout (que ya lo hace en `/cart`).

## Cambios

1. `src/lib/cart.tsx` — endurecer persistencia sin cambiar la API pública:
   - Inicializar `items` con lazy initializer que lee `localStorage` cuando `typeof window !== "undefined"`, para que el primer render en cliente ya tenga los items.
   - Añadir `hydratedRef` para que el efecto de escritura no corra antes de completar la hidratación (elimina la carrera que puede escribir `[]`).
   - Añadir listener `window.storage` para sincronizar entre pestañas.

2. Unificar el add-to-cart quitando `gate.guard(...)` alrededor de `cart.add` (dejando el `cart.add` directo, igual que `/shop`) en:
   - `src/routes/best-sellers.tsx` (fix principal)
   - `src/routes/index.tsx` (slider destacado)
   - `src/routes/explore.tsx`
   - `src/routes/menu.tsx`
   - `src/routes/build-pack.tsx`

   El `SubscriptionGate` **se mantiene** en el flujo de pago (`/cart` → `startCheckout`) y donde ya protege pantallas de suscriptor. No se toca su lógica.

3. Añadir `toast.success("<nombre> agregado al carrito")` en `/best-sellers` para igualar el feedback que ya da `/shop`. Es la misma UX de confirmación textual; no cambia estilos ni layout.

## Fuera de alcance

- No cambia diseño visual de botones, tarjetas ni layout.
- No cambia la API de `useCart` ni el shape de `CartItem`.
- No se migra el carrito a Supabase por usuario autenticado (opcional a futuro); con `localStorage` global se cumple el requisito de persistencia entre rutas y refresh.
- No se modifica el gate del checkout ni el diálogo de suscripción.

## Verificación

- Playwright headless en `/best-sellers`: click en "Agregar al carrito" incrementa el contador del `TopNav` y `/cart` muestra el item.
- Recargar `/cart` con items: siguen visibles (persistencia).
- `/shop` y resto de rutas: comportamiento idéntico al actual.
