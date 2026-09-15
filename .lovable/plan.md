# Fase 1 — Marketplace de tiendas (estilo Instacart)

Sin carrito ni checkout. No se toca nada de pagos, usuarios ni clientes.

## Qué vas a ver al final

- Cada negocio aprobado tendrá su propio panel para armar su catálogo (categorías, productos, fotos, precios).
- Cada tienda tendrá una página pública propia con su dirección web: `/tienda/nombre-de-la-tienda`.
- Un directorio `/tiendas` con buscador y filtros por zona y tipo, enlazado desde el menú principal.
- Tú apruebas o rechazas solicitudes desde `/admin/negocios`, y al aprobar el negocio recibe un correo avisándole que ya puede subir su catálogo.
- Todo en español e inglés.

## Migración 1 — ampliar la ficha del negocio

Sobre la tabla `businesses` (ya existe con: nombre, tipo, correo, teléfono, dirección, ciudad, estado, logo, motivo de rechazo):

- `slug` texto único → la dirección web de la tienda. Se genera del nombre; si se repite, se le añade un número.
- `banner_url`, `descripcion`
- `horario` json (un bloque por día: abre, cierra, cerrado sí/no)
- `zonas_que_atiende` array de texto (usa las zonas de NYC que ya existen)
- `comision_porcentaje` numérico, valor inicial 15
- `activo` booleano, valor inicial verdadero

Nota: el estado ya existe en la tabla con los valores pendiente / aprobado / rechazado / suspendido, y lo reutilizo tal cual en vez de crear otra columna.

## Migración 2 — catálogo

`store_categories`: negocio, nombre, orden, fechas.
`store_products`: negocio, categoría, nombre, descripción, precio, unidad (lb, unidad, paquete…), imagen, disponible, orden, fechas.

Permisos (RLS) en ambas:
- El dueño ve, crea, edita y borra solo lo de su propio negocio.
- Cualquier visitante, incluso sin cuenta, solo puede leer productos y categorías de negocios aprobados y activos.
- El administrador ve y edita todo.

También se crea el espacio de archivos `store-media` (público) para logos, banners y fotos de producto, con subida permitida solo al dueño dentro de su propia carpeta.

## Pantallas

**`/negocios/panel`** (solo el dueño)
- Si la solicitud está pendiente: pantalla "Tu solicitud está en revisión".
- Si fue rechazada o suspendida: aviso con el motivo.
- Si está aprobada: panel con tres secciones — Mi tienda (logo, banner, descripción, horario por día, zonas), Categorías (crear, renombrar, ordenar, borrar) y Productos (agregar, editar, borrar, foto, precio, unidad, categoría, interruptor de "disponible"). Arriba, el conteo de productos publicados.

**`/tienda/{slug}`** (pública)
- Banner y logo arriba, con nombre, zona y horario.
- Aviso "Cerrado ahora" si según su horario está cerrada.
- Buscador dentro de la tienda.
- Productos agrupados por categoría, en tarjetas con foto, nombre, precio y unidad.
- Los no disponibles salen en gris con la etiqueta "Agotado".

**`/tiendas`** (pública)
- Tarjetas con logo, nombre, tipo y zona.
- Buscador y filtros por zona y por tipo.
- Solo tiendas aprobadas, activas y con al menos un producto disponible.
- Se añade "Tiendas" al menú principal y al menú lateral.

**`/admin/negocios`** (ya existe)
- Se mantiene la lista con Aprobar / Rechazar y se le añade el envío de correo al aprobar, con una plantilla nueva ("Tu negocio fue aprobado — ya puedes subir tu catálogo").

## Traducciones

Claves nuevas en `src/locales/es` e `src/locales/en`; los otros 7 idiomas reciben el texto en inglés como respaldo, igual que en el resto del sitio.

## Detalles técnicos

- Lecturas públicas vía server functions con clave publicable y políticas `TO anon`; lecturas y escrituras del dueño vía `requireSupabaseAuth`.
- Archivos nuevos: `src/lib/store.ts` (tipos), `src/lib/store.functions.ts` (dueño), `src/lib/store-public.functions.ts` (público), `src/lib/store-hours.ts` (abierto/cerrado), rutas `_authenticated/negocios.panel.tsx`, `tienda.$slug.tsx`, `tiendas.tsx`, plantilla `business-approved.tsx`.
- Archivos modificados: `admin.negocios.tsx`, `email-templates/registry.ts`, `TopNav.tsx`, `CategorySidebar.tsx`, los 9 archivos de traducción.
- `head()` propio con título y descripción en `/tiendas` y `/tienda/{slug}` (esta última con el nombre real de la tienda).
