# Estado actual de Google Maps Platform

Sí, técnicamente ya está listo para funcionar. El código ya:

- Lee tu `GOOGLE_API_KEY` desde el servidor y la entrega al navegador solo cuando carga el mapa (no se expone en el bundle).
- Cae a la key gestionada de Lovable como respaldo si por alguna razón la tuya no está.
- Usa el gateway de Lovable para las llamadas del servidor (Routes API para batching y optimización), así que eso funciona en cualquier dominio sin tocar nada.

## Lo único que depende de ti (fuera del código)

En Google Cloud Console, sobre la API key que guardaste como `GOOGLE_API_KEY`:

1. **HTTP referrers permitidos** — deben incluir:
   - `https://origen.management/*` y `https://*.origen.management/*`
   - `https://hazorex.com/*` y `https://*.hazorex.com/*`
   - `https://*.lovable.app/*` y `https://*.lovableproject.com/*` (para preview)
2. **APIs habilitadas en el proyecto de Google Cloud**:
   - Maps JavaScript API
   - Places API (New) — si usaremos autocomplete de direcciones
   - Geocoding API, Routes API — ya se llaman por el gateway, pero conviene tenerlas activas por si luego movemos algo al cliente
3. **Billing activo** en ese proyecto de Google Cloud (Maps exige billing habilitado incluso dentro del free tier).

## Cómo verificar que ya anda

Después de publicar:

- Abrir `https://www.origen.management` (o `hazorex.com`) en una ruta que use el mapa: `/pedido/{id}/seguimiento` o `/repartidor/pedido/{id}/navegacion`.
- El mapa debe cargar sin el error `RefererNotAllowedMapError` en la consola.
- Si aparece `REQUEST_DENIED` o el mapa queda gris: falta un referrer o una API en Cloud Console; no es un cambio de código.

## Plan propuesto

No hace falta tocar código ahora. Confirmar los 3 puntos de Google Cloud arriba, publicar y probar en el dominio real. Si algo falla, capturamos el error de consola y decidimos si es referrer, API deshabilitada o billing.
