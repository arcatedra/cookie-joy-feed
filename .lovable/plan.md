
# Cierre visual de "Postula tu negocio"

El flujo principal (`/negocios/registro` y `/negocio`) ya está alineado. Faltan dos sub-rutas que quedaron con la paleta naranja antigua.

## Cambios

### 1. `src/routes/_authenticated/negocio.productos.tsx`
- Envolver todo el `main` en un contenedor `min-h-screen bg-[#f4f1ea] text-[#1e3a5f]` para heredar el fondo crema.
- Botones "Nuevo" y "Guardar" (form): cambiar de `bg-amber-600 hover:bg-amber-700 text-white` a `bg-[#1e3a5f] hover:bg-[#16294a] text-white` con `min-h-11`, en línea con los botones del tab de catálogo dentro de `/negocio`.
- Enlaces "Postúlate" y "Ver estado": reemplazar `text-amber-700` por `text-[#1e3a5f] font-semibold`.
- Enlace "Mi negocio" (back): cambiar hover a `hover:text-[#1e3a5f]` y color base `text-[#4a3525]` para consistencia con `/negocio`.
- Título `<h1>Productos</h1>`: color `text-[#1e3a5f]`.

### 2. `src/routes/_authenticated/negocio.ofertas.tsx`
Mismos cambios equivalentes:
- Wrapper `min-h-screen bg-[#f4f1ea] text-[#1e3a5f]`.
- Botones "Nueva" y "Crear oferta": `bg-[#1e3a5f]` navy con texto blanco y `min-h-11`.
- Enlace "Ver estado": `text-[#1e3a5f] font-semibold` en vez de `text-amber-700`.
- Back link y título en navy.
- Se conserva la badge de descuento en oro (`bg-amber-100 text-amber-800`) porque comunica una promoción y ya cumple contraste AA.

### 3. `src/routes/negocios.registro.tsx`
- Eliminar la línea en blanco huérfana dentro del bloque `submitted` (cosmético).

## Verificación

1. `bunx tsgo` — typecheck limpio.
2. Playwright con `LOVABLE_BROWSER_SUPABASE_*` inyectado:
   - Navegar a `/negocio`, `/negocio/productos`, `/negocio/ofertas`, `/negocios/registro`.
   - Screenshot de cada pantalla a 1280 px.
   - Confirmar: fondo crema uniforme, botones navy/oro, sin restos naranja, back-links legibles.
3. Console limpia en las 4 rutas.

## Fuera de alcance

- No se toca `src/lib/businesses.ts` ni las server functions.
- No se cambian los badges de estado del negocio (pendiente/aprobado/rechazado) — ya cumplen contraste.
- No se modifica la lógica del formulario ni las validaciones.
