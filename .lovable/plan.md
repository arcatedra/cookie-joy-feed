## Objetivo

Que al cambiar idioma desde el selector, **todo** el sitio cambie a ese idioma y se mantenga (ya persiste en `localStorage`). Idiomas objetivo: `en`, `es`, `pt`, `fr`, `it`, `zh`, `fil`.

## Estado actual

- Infra i18n correcta: `src/i18n/index.ts` con `setLanguage`/`syncClientLanguage`, persistencia en `localStorage`, `LanguageSwitcher` ya enlazado en TopNav.
- Las 380 claves existentes están al 100% en los 7 idiomas (acabo de completar fr/it/zh).
- ~26 archivos con texto en duro (mayormente español) que **no** usan `t()`. Esos textos no cambian al alternar idioma.

## Archivos a refactorizar

Rutas (alto volumen de copy):
- `src/routes/ruleta.tsx`
- `src/routes/donate.tsx`
- `src/routes/shop.tsx`
- `src/routes/search.tsx`
- `src/routes/product.$handle.tsx`
- `src/routes/reel.$reelId.tsx`
- `src/routes/historial.tsx`
- `src/routes/trust.tsx`
- `src/routes/terms.tsx`
- `src/routes/sweepstakes-rules.tsx`
- `src/routes/unsubscribe.tsx`
- `src/routes/_authenticated/claim.$drawDate.tsx`
- `src/routes/_authenticated/route.tsx` (loader/redirect copy si hay)
- `src/routes/admin.shipping.tsx`, `src/routes/admin.sweepstakes.tsx` — **se excluyen**: son páginas administrativas internas, no de usuario final.

Componentes:
- `src/components/FullscreenDrawExperience.tsx`
- `src/components/ShopifyCartDrawer.tsx`
- `src/components/DailyWinnerBanner.tsx`
- `src/components/DeliveryCounter.tsx`
- `src/components/LiveDrawSection.tsx`
- `src/components/PrizePoolCounter.tsx`
- `src/components/TierBadge.tsx`

Sin cambios (sin copy traducible o ya cubiertos):
- `*Logo.tsx`, `BrandIcons.tsx` (solo SVG/imagen)
- `src/components/ui/*` (primitivas shadcn)
- Archivos ya refactorizados que aparecen en la lista de "usa i18n".

También cubrir notificaciones/toasts:
- Recorrer `toast(...)` / `sonner` / `alert(...)` / mensajes de `try/catch` en todos los archivos modificados, envolverlos en `t()`.

## Cómo lo voy a hacer (técnico)

1. **Extracción**: por cada archivo de la lista, identifico cada string visible (JSX text, `aria-label`, `placeholder`, `title`, `alt`, toasts, mensajes de error). Asigno claves jerárquicas siguiendo el patrón existente, por archivo/sección:
   - `ruleta.*`, `donate.*`, `shop.*`, `product.*`, `reel.*`, `historial.*`, `trust.*`, `terms.*`, `sweepstakesRules.*`, `unsubscribe.*`, `claim.*`, `fullscreenDraw.*`, `cartDrawer.*`, `dailyWinner.*`, `deliveryCounter.*`, `liveDraw.*`, `prizePool.*`, `tierBadge.*`.
   - Strings dinámicos con valores usan placeholders i18next: `{{name}}`, `{{count}}`, `{{prize}}`.
   - Plurales con `t('key', { count })` + variante `_one`/`_other` cuando aplica.

2. **Inserción de claves**: agrego todas las claves nuevas a `src/locales/en/translation.json` (fuente de verdad) bajo los namespaces nuevos, preservando los 380 existentes.

3. **Traducción automática**: con un script idéntico al que ya usé para fr/it/zh, llamo a Lovable AI Gateway (`google/gemini-2.5-pro`) para generar los 6 idiomas restantes (es, pt, fr, it, zh, fil) **solo de las claves nuevas**, luego merge con los archivos existentes para no perder calidad. Reglas del prompt: preservar keys, placeholders `{{x}}`, HTML, emojis, y dejar marcas (Hazorex, OriGen, AmyraX, Origen) sin traducir.

4. **Refactor de componentes**: por cada archivo, reemplazo strings por `t('key')`, agrego `const { t } = useTranslation()` donde falte, y mantengo `getLocale`/`formatPrice`/`formatDate`/`formatNumber` para fechas y números (ya existen helpers).

5. **Verificación**:
   - Conteo de claves: cada locale debe tener el mismo conjunto que `en`.
   - Build TypeScript ok.
   - Smoke test con Playwright headless: cargo `/ruleta`, cambio a `fr`, verifico que el botón principal y el countdown cambien; cambio a `zh`, mismo check. Recargo y verifico que persista.

## Estrategia por turnos

El cambio es grande (≈26 archivos + ~150-250 claves nuevas). Para no exceder un turno, lo divido así:

- **Turno 1 (este)**: navegación + ruleta + checkout (`FullscreenDrawExperience`, `ruleta`, `ShopifyCartDrawer`, `DailyWinnerBanner`, `DeliveryCounter`, `LiveDrawSection`, `PrizePoolCounter`, `TierBadge`). Es el flujo que estás viendo ahora mismo.
- **Turno 2**: shop, product, reel, search, historial, donate.
- **Turno 3**: trust, terms, sweepstakes-rules, unsubscribe, claim, route gate.

Al final de cada turno: traducciones regeneradas para las claves nuevas y verificación.

## Lo que NO toco

- `src/components/ui/*` (primitivas).
- `admin.*` (interno, no requerido).
- Estructura de `src/i18n/index.ts`, `LanguageSwitcher`, persistencia. Ya funciona correctamente.
- Backend / SQL / cron.
