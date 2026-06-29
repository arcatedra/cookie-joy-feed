# Aplicar el logo de Hazorex en toda la app

## 1. Subir el logo como asset del CDN
- Subir `user-uploads://Diseño_sin_título.png` con `lovable-assets create` → `src/assets/hazorex-logo.png.asset.json`.
- Generar también una versión favicon (32×32 / 180×180 para Apple touch) desde la misma imagen y subirlas como assets:
  - `src/assets/hazorex-favicon.png.asset.json`
  - `src/assets/hazorex-apple-touch.png.asset.json`

## 2. Favicon + metadatos sitewide
- Editar `src/routes/__root.tsx`:
  - Reemplazar `links` del favicon actual por el nuevo `hazorex-favicon` (32×32) y añadir `apple-touch-icon` (180×180).
  - Mantener `og:site_name = "Hazorex"`.
  - Añadir `og:image` por defecto solo si no rompe rutas hijas (preferiblemente dejarlo en rutas leaf clave: home, login, privacidad, términos).

## 3. Logo en header / navbar
- Localizar el componente de header principal (probablemente `src/components/Header.tsx` o similar) y reemplazar el logo/marca textual actual por:
  ```tsx
  import logo from "@/assets/hazorex-logo.png.asset.json";
  <img src={logo.url} alt="Hazorex" className="h-8 w-auto" />
  ```
- Mantener el texto "Hazorex" al lado del icono para legibilidad y SEO.

## 4. Logo en pantallas de login / registro
- Localizar las rutas/componentes de auth (login, registro, recuperar contraseña) y añadir el logo centrado arriba del formulario, tamaño ~64–80px.
- Aplicar también en `src/routes/privacidad.tsx` y `src/routes/terminos.tsx` en la cabecera para consistencia con la consent screen de Google.

## 5. Open Graph image
- Añadir `og:image` y `twitter:image` en rutas leaf principales (`/`, `/privacidad`, `/terminos`, `/auth` si existe) apuntando al URL absoluto del logo (`https://hazorex.com` + asset URL).
- Recordatorio: los crawlers cachean OG; los previews ya compartidos no se actualizan al instante (debugger de cada red para forzar refresh).

## Detalles técnicos
- Usar `lovable-assets create --file /mnt/user-uploads/Diseño_sin_título.png --filename hazorex-logo.png`.
- Para favicon redimensionar con Python/PIL antes de subir.
- No tocar `src/integrations/supabase/*` ni `routeTree.gen.ts`.
- Verificar build al final.
