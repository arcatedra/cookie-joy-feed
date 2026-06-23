
# Checklist para dejar los sorteos listos para producción

Te respondo con sinceridad: el sistema **funciona end-to-end** (entrar con stars, AMOE gratis, cierre por cutoff, sorteo determinista, ganador, claim, email automático). Lo que falta para considerarlo "perfecto y listo" son piezas operativas y de cumplimiento legal, no de código base.

## 1. Cron / automatización del sorteo (CRÍTICO)

Hoy `run_daily_draw()` existe pero **nadie lo dispara automáticamente** a las 20:00 ET. Falta:
- Programar `pg_cron` para llamar `/api/public/hooks/run-daily-draw` todos los días a las 20:00 ET (00:00 UTC en invierno / 01:00 UTC en verano — usar cron en UTC fijo y dejar la función decidir si corresponde por `today_et()`).
- Programar `pg_cron` para `close_draws_for_cutoff()` cada minuto (cerrar entradas en el último cutoff).
- Programar `pg_cron` para `expire_winner_claims()` una vez al día (marcar reclamos vencidos).

## 2. Flujo de reclamo del ganador (verificación)

La ruta `/claim/$drawDate` existe pero falta validar:
- Que el ganador pueda subir documentos (W-9 / ID) al bucket `winner-documents` ya creado.
- Notificación al admin cuando el ganador envía sus documentos.
- Botón en `/admin/sweepstakes` para aprobar/rechazar el reclamo y marcar `paid_at` cuando se hace el pago.

## 3. Reglas oficiales (legal)

`sweepstakes-rules.tsx` está publicada pero conviene revisar contra `sweepstakes_config` real:
- Sponsor: HAZOREX ORIGEN LLC, 365 58th Street, Brooklyn, NY 11220.
- Estados excluidos, edad mínima, ventana de reclamo, premio máximo diario — todos los valores que muestran las reglas deben coincidir con los de la BD (hoy se leen, pero hay que verificar el render final).
- Confirmar que el AMOE postal está documentado (dirección postal para enviar entrada gratis por correo).

## 4. Monitoreo de emails de ganador

- Verificar end-to-end: insertar un `winner_claims` de prueba y confirmar que llega el email vía `email_send_log` (`template_name = 'winner-notification'`, status `sent`).
- Agregar a un dashboard admin (si lo quieres) el conteo de winners notificados / pendientes.

## 5. Pequeños pulidos UX

- Mostrar countdown al próximo sorteo en `/ruleta` (ya hay componentes, falta verificar que use `scheduled_at` real).
- Estado "DRAW_CLOSED" amigable cuando alguien intenta entrar después del cutoff.
- Confirmación visual tras enviar AMOE (hoy puede ser silenciosa).

## 6. Pruebas en vivo antes de lanzar

Plan mínimo de smoke test:
1. Crear entrada con stars → ver ticket en `daily_draw_entries`.
2. Crear entrada AMOE → ver fila en `amoe_entries` + `daily_draw_entries`.
3. Forzar `run_daily_draw()` manualmente → ver `daily_draws.status='completed'`, `winner_claims` creado, email enviado.
4. Abrir `/claim/$drawDate` como ganador → completar flujo de documentos.

---

## ¿Qué hago en el siguiente turno?

Propongo atacar **#1 (cron automático)** primero porque sin eso el sorteo no corre solo. Después #2 (flujo de claim con documentos) y #4 (verificación de email real).

¿Empiezo por el cron de los 3 jobs (`run_daily_draw`, `close_draws_for_cutoff`, `expire_winner_claims`), o prefieres que primero verifique con un sorteo de prueba real que el email de ganador llega bien?
