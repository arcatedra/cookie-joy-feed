# Plan: 4 arreglos en una sola tanda

Hago las 4 cosas en una sola ejecución para no fragmentar créditos.

## 1. Footer global con enlaces legales

Crear `src/components/SiteFooter.tsx` y montarlo en `src/routes/__root.tsx` debajo del `<Outlet />`.

Contenido:
- Logo + tagline corto en español
- Columnas: **Tienda** (Shop, Ruleta, Suscripción), **Cuenta** (Perfil, Historial, Entregas), **Legal** (Términos, Privacidad, Reglas del sorteo, Confianza), **Contacto** (email + redes si existen)
- Línea inferior: © Hazorex 2026 + selector de idioma compacto
- Estilo: navy del header con borde dorado fino, tipografía Cinzel para títulos y Cormorant para enlaces, coherente con el sitio

## 2. Hero claro en `/` (home)

Editar `src/routes/index.tsx`:
- Bloque superior nuevo (encima de lo existente) con:
  - **H1** corto: "Galletas premium con sorteos diarios reales"
  - Subtítulo de 1 línea explicando la propuesta (compra galletas → cada compra entra al sorteo verificable)
  - 2 CTAs: **"Ver galletas"** (→ /shop) y **"Cómo funciona el sorteo"** (→ /ruleta)
  - Indicador de confianza: contador de premio actual (ya existe `PrizePoolCounter`) + "Sorteo 100% verificable"
- Mantener todo el contenido existente debajo sin tocar lógica

## 3. Checkout end-to-end — verificación, no rebuild

Revisar y arreglar SOLO lo que rompa el flujo actual:
- `src/routes/cart.tsx` → confirmar que el botón pagar llama a Stripe correctamente
- `src/lib/stars-checkout.functions.ts` y resto de funciones de pago → confirmar `return_url` y manejo de éxito
- Crear/verificar página de confirmación `/checkout/success` que muestre resumen y CTA "Ver mis pedidos"
- Verificar que el email de confirmación se dispara (ya existe `order-confirmation.tsx`)
- Empty state del carrito con CTA a /shop

Si el flujo ya funciona, solo añadir la página de confirmación y el empty state. No reescribo Stripe.

## 4. Header móvil <380px

Editar `src/components/TopNav.tsx`:
- Ocultar elementos secundarios bajo `<380px`: dirección, contador de entregas, "Devoluciones" — visibles desde `sm:` (640px) en adelante
- Mantener visibles siempre: logo, carrito, menú hamburguesa
- Verificar con Playwright a 360px y 1280px que nada se desborda

## Verificación final (una sola pasada)

- `bun run build` — confirmar que compila
- Playwright: screenshot de home (desktop + 360px) confirmando footer, hero y header limpios
- Reportar al usuario qué cambió y qué quedó verificado

## Lo que NO hago en esta tanda (para no gastar de más)

- Rediseño visual completo / sistema de tokens reducido
- SEO por ruta (`head()` individual en cada página)
- Optimización del logo PNG a WebP
- Skeletons, push notifications timing, auditoría i18n, E2E tests

Si después de esta tanda quieres seguir con alguno, lo pides explícitamente.
