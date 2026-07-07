# Plan: dejar Hazorex "perfecto y funcionando"

La web es grande (60+ tablas, sorteo diario, pagos Stripe, repartidores con payouts, delivery multi-parada, negocios, reels, referrals, emails, i18n). No se puede arreglar "todo" en un solo turno sin riesgo, así que propongo una **auditoría concreta** primero (turno 1) y luego **fases de fix priorizadas** que ejecuto en turnos siguientes, cada una verificable.

## Fase 0 — Auditoría (este turno tras aprobar)

Reviso y devuelvo informe corto con hallazgos priorizados (P0 rompe / P1 riesgo / P2 pulido):

1. **Seguridad backend**
   - `security--run_security_scan` + `supabase--linter`
   - Revisar RLS y GRANTs en las 60+ tablas (foco: `orders`, `subscriptions`, `driver_payouts`, `winner_claims`, `donations`, `profiles`, `user_roles`, `stripe_onboarding_events`, `notification_queue`, `internal_hook_config`).
   - Verificar que `service_role` nunca se exponga al cliente y que webhooks públicos (`/api/public/*`) validen firma.
2. **Pagos**
   - `payments--get_go_live_status`
   - Webhook Stripe principal (`payments/webhook.ts`) + Connect webhook (payouts repartidores).
   - Idempotencia, manejo de `payout.failed`, reversos de wallet.
3. **Sorteo diario**
   - Cron `run-daily-draw`, `close_draws_for_cutoff`, rollover, `seed_hash` verificable, ventana de reclamo.
   - AMOE bloqueado si `sponsor_address` no está configurado (ya lo veo en `submit_amoe_entry`).
4. **Repartidores / Delivery**
   - Flujo: onboarding Stripe Connect → aceptar ruta → escanear → tránsito → entrega con foto → wallet → payout instantáneo.
   - Estados y triggers (`credit_wallet_on_route_complete`, `complete_route_stop`).
5. **Emails**
   - `email_domain--check_email_domain_status`, cola pgmq, DLQ, templates registrados vs usados.
   - Nuevo hook `notify-order` funcionando (trigger + `internal_hook_config`).
6. **SEO + performance**
   - `seo_chat--list_findings`, meta/OG por ruta, `sitemap.xml`, robots.
   - `supabase--slow_queries` para queries lentas.
7. **Runtime / build**
   - `code--read_runtime_errors`, logs del dev server, consola del navegador, network.
8. **Frontend UX crítico**
   - Rutas auth/públicas correctamente clasificadas (`_authenticated/` vs top-level).
   - i18n: claves faltantes en 9 locales.

Entregable: lista P0/P1/P2 con archivo:línea y fix propuesto.

## Fase 1 — Arreglos P0 (bloqueantes / seguridad)
Aplico en un turno:
- Cerrar cualquier tabla sin RLS o con policy demasiado abierta.
- Fix de webhooks (firma, idempotencia, status codes).
- Fix de pagos/payouts que puedan perder dinero (reverse, doble-cobro, race conditions).
- Errores de runtime que rompan build o rutas.

## Fase 2 — Arreglos P1 (funcionalidad clave)
- Sorteo end-to-end verificable (seed hash publicado, ganador, rollover, reclamo).
- Flujo repartidor completo sin dead-ends.
- Emails: templates faltantes, suppression, unsubscribe, DLQ.
- Notificaciones push si están rotas.

## Fase 3 — Arreglos P2 (pulido)
- SEO: meta/OG por ruta, sitemap, JSON-LD donde aplique.
- Performance: índices para queries lentas, lazy-loading imágenes/reels.
- i18n: completar traducciones.
- Accesibilidad básica (alt, aria).
- Limpieza de código muerto.

## Cómo lo ejecuto
- **Este turno**: al aprobar el plan, hago solo Fase 0 (auditoría, sin cambios) y devuelvo el informe P0/P1/P2.
- **Turnos siguientes**: vos me decís "seguí" y voy Fase 1 → 2 → 3, cada una con verificación (build, tests, browser check en preview) antes de pasar a la próxima.

## Detalles técnicos
- Cambios de schema van por `supabase--migration` (aprobás cada uno).
- No toco archivos auto-gen ni el sorteo random (regla core: sorteo verificable, sin override de admin).
- Producción con usuarios reales → migraciones no destructivas; cualquier cambio de columna con default seguro; nunca `DROP` de datos.
- Secrets faltantes se piden con `add_secret` antes de escribir código que los use.

## Riesgo
Es trabajo largo. Estimado: 5–10 turnos según cuántos P0/P1 aparezcan. Si preferís que empiece directo por un área (ej. solo seguridad+pagos) en vez de auditoría completa, decímelo y ajusto.