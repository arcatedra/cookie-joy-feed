
## Objetivo

Migrar los 10 reels locales (`LOCAL_FALLBACK_REELS` en `src/components/CookiesTV.tsx`) a una tabla real `public.reels` en Supabase, manteniendo el fallback local intacto para que el carrusel se vea y funcione **exactamente igual** que ahora. Cero cambios visuales.

## Garantías de seguridad ("sin dañar nada")

- El fallback local `LOCAL_FALLBACK_REELS` **no se elimina**. Si la tabla falla, está vacía, o Supabase no responde, el carrusel sigue mostrando los mismos 10 reels que hoy.
- Los `id`, `slug`, `product_slug`, precios e imágenes sembrados en la tabla son idénticos a los del array local, así que `REEL_TEXT_KEY_MAP` y `REEL_SLUG_TO_PRODUCTO_ID` siguen funcionando sin cambios.
- Los assets de video (`reel1.url`, `reelPista.url`, etc.) se siguen sirviendo desde el bundle local — la tabla solo guarda la referencia (URL construida en el cliente) para no depender del Storage de Supabase todavía.
- Solo lectura pública (`SELECT` para `anon`), sin `INSERT/UPDATE/DELETE` públicos → nadie externo puede alterar los reels.

## Pasos

### 1. Migración de esquema
Crear `public.reels` con las columnas que ya espera `DbReel` en `CookiesTV.tsx`:
`id, slug, title, video_url, thumb_url, product_name, product_price, product_image, product_slug, author_id, created_at`.

Aplicar el bloque estándar: `CREATE TABLE` → `GRANT SELECT` a `anon` y `authenticated` + `GRANT ALL` a `service_role` → `ENABLE ROW LEVEL SECURITY` → política `SELECT` pública (los reels son contenido público de portada).

### 2. Semilla con los 10 reels actuales
Insertar exactamente las mismas filas que hoy están en `LOCAL_FALLBACK_REELS`, usando los mismos `slug` y `product_slug`. `video_url` queda `NULL` (o una cadena marcadora) — el cliente ya sabe caer al asset local por `slug` cuando no hay URL remota reproducible.

### 3. Cambio mínimo en el cliente (opcional, no rompe nada)
En `src/components/CookiesTV.tsx`, después del `select("*")`:
- Si Supabase devuelve filas, fusionarlas por `slug` con `LOCAL_FALLBACK_REELS` para **rellenar** `video_url` desde el asset local cuando falte.
- Si no devuelve filas o hay error, seguir usando `LOCAL_FALLBACK_REELS` tal como hoy.

Resultado: mismos 10 reels, mismo orden, mismos textos, mismos videos.

### 4. Verificación
- `supabase--read_query` para confirmar las 10 filas.
- Cargar `/` y confirmar visualmente que el carrusel se ve idéntico.
- Probar "Comprar" desde un reel → sigue mapeando al `producto` correcto vía `REEL_SLUG_TO_PRODUCTO_ID`.

## Lo que NO se toca

- `/shop`, `/cart`, `/subscribe`, checkout, suscripciones, sorteo.
- Traducciones ni claves i18n.
- Assets de video locales (siguen en el bundle).
- El fallback local — se mantiene como red de seguridad permanente.

## Detalles técnicos

```sql
CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text,
  video_url text,
  thumb_url text,
  product_name text,
  product_price numeric(10,2),
  product_image text,
  product_slug text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reels TO anon, authenticated;
GRANT ALL   ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reels are publicly readable"
  ON public.reels FOR SELECT TO anon, authenticated USING (true);
```

Seed: 10 filas con los `slug` `demo-nutella`, `demo-cookies-cream`, `demo-pb`, `reel-pista`, `reel-triple`, `reel-snicker`, `reel-oatmeal`, `reel-cchunk`, `reel-mint`, `reel-mm`.

¿Procedo?
