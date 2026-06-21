## Objetivo

Añadir una página `/domains` en la app donde cualquier usuario pueda escribir un nombre (ej. `mahanaix`), ver si el `.com` está disponible y ver alternativas (otros TLDs + variaciones del nombre) con su disponibilidad.

## Cómo funciona la disponibilidad

Para evitar pedir API keys de pago (GoDaddy/Namecheap requieren cuenta aprobada), uso el protocolo público **RDAP** (`https://rdap.org/domain/{dominio}`):

- HTTP 404 → dominio **disponible**
- HTTP 200 → dominio **registrado** (devuelve fecha de registro y registrar)
- HTTP 429/otro → estado **desconocido**, mostramos aviso

RDAP es gratuito, sin clave, mantenido por los registries oficiales (ICANN). Es la misma fuente que usan whois.com y similares.

## Precios

No hay API pública gratuita y universal de precios. Muestro **precios de referencia estimados** (USD/año, primer año, registrar promedio) en una tabla local por TLD: `.com $12`, `.net $14`, `.org $13`, `.io $35`, `.co $30`, `.shop $4 promo / $35`, `.store $5 promo / $60`, `.app $18`, `.dev $18`, `.management $30`. Etiquetado claramente como "estimado" con enlace al registrar.

Si más adelante quieres precios en vivo y compra real, conectamos Namecheap/GoDaddy API (requiere cuenta y aprobación) — lo dejo fuera de este alcance.

## UI

Página nueva `/domains` (TanStack route), totalmente i18n (claves `domains.*` en EN/ES/PT/DE/FIL), accesible desde el menú principal:

```text
┌───────────────────────────────────────────┐
│  [ mahanaix          ] [ Buscar ]         │
├───────────────────────────────────────────┤
│  ✓ mahanaix.com     disponible    ~$12   │
│  ✓ mahanaix.net     disponible    ~$14   │
│  ✗ mahanaix.io      registrado            │
│  ✓ mahanaix.co      disponible    ~$30   │
│  ✓ mahanaix.shop    disponible    ~$4    │
│  ✓ mahanaix.store   disponible    ~$5    │
│  ✓ mahanaix.app     disponible    ~$18   │
├─ Variaciones similares ──────────────────┤
│  ✓ getmahanaix.com  disponible    ~$12   │
│  ✓ mahanaixhq.com   disponible    ~$12   │
│  ✓ mahanaix.shop    disponible    ~$4    │
│  ✓ trymahanaix.com  disponible    ~$12   │
└───────────────────────────────────────────┘
```

Cada fila tiene botón "Comprar" que abre el registrar (Namecheap affiliate-friendly URL) en nueva pestaña con el dominio prerellenado.

## Estructura técnica

- `src/routes/domains.tsx` — página + `useSuspenseQuery`, head() con título y meta propios.
- `src/routes/api/public/domain-check.ts` — server route GET `?domain=foo.com`, llama a `https://rdap.org/domain/...` desde el servidor (evita CORS), devuelve `{ domain, status: 'available'|'taken'|'unknown', registrar?, registeredOn? }`. Cachea en memoria 10 min para no martillar RDAP.
- `src/lib/domain-pricing.ts` — tabla TLD → precio estimado + URL del registrar.
- `src/lib/domain-suggestions.ts` — genera variaciones (`get`, `try`, `my`, sufijos `hq`, `app`, `io`) y lista de TLDs a chequear.
- Traducciones añadidas a `src/locales/{en,es,pt,de,fil}/translation.json` bajo `domains.*`.

El cliente dispara N llamadas en paralelo (una por dominio candidato, ~10 total) al endpoint local; cada una tarda <300ms. Resultados se renderizan con skeletons mientras llegan.

## Lo que NO incluye

- Compra/registro real del dominio dentro de la app (solo redirige al registrar).
- Precios en tiempo real por API (estimados de referencia).
- WHOIS detallado (nameservers, contactos) — solo estado + registrar/fecha.

¿Apruebas para implementarlo?
