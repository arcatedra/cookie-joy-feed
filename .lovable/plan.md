## Estado actual

Lo terminado y verificado:
- Cron diario 20:00 ET con DST automático
- i18n completo en: navegación, `/ruleta`, `FullscreenDrawExperience`, `ShopifyCartDrawer`, `LiveDrawSection`, `PrizePoolCounter`, `DailyWinnerBanner`, `DeliveryCounter`
- 7 idiomas sincronizados (en, es, pt, fr, it, zh, fil)
- Typecheck sin errores

## Lo que aún falta (del plan original "cobertura total")

Quedan ~18 archivos con texto hardcoded en español que NO cambian al traducir:

**Turno 2 — páginas largas**
- `donate.tsx`
- `shop.tsx`
- `product.$handle.tsx`
- `reel.$reelId.tsx`
- `search.tsx`
- `historial.tsx`

**Turno 3 — páginas legales/secundarias**
- `trust.tsx`
- `terms.tsx`
- `sweepstakes-rules.tsx`
- `unsubscribe.tsx`
- `claim.$drawDate.tsx`
- `route.tsx` (loader/redirect)

## Opciones

1. **Continuar Turno 2** (shop, donate, product, reel, search, historial) — alto impacto comercial
2. **Continuar Turno 3** (legales) — menor tráfico, texto más estable
3. **Hacer Turno 2 + Turno 3 seguidos** — termina el alcance "cobertura total"
4. **Parar aquí** — declarar suficiente lo ya cubierto (flujo principal)

Dime cuál prefieres y lo ejecuto.
