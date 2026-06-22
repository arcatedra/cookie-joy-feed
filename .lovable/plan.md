El sorteo HAZOREX está 90% implementado. He auditado el código completo y la base de datos. Estos son los pasos que faltan para que funcione perfectamente, en orden de prioridad:

## 1. Bloqueante CRÍTICO — Crear bucket `winner-documents` en Storage

El flujo de reclamo del ganador (página `/claim/$drawDate`) permite subir documentos de identidad y W-9 a un bucket de Supabase Storage llamado `winner-documents`. **Este bucket NO EXISTE**. Sin él, el ganador no puede completar su reclamo.

Acción: Crear el bucket privado `winner-documents` y aplicar las políticas RLS ya definidas en la migración SQL.

## 2. Bypass de `/lovable/` en request middleware

El email queue processor (`/lovable/email/queue/process`) necesita que las rutas `/lovable/` no pasen por middleware de auth o redirects. El `errorMiddleware` en `src/start.ts` ya tiene el bypass, pero necesitamos asegurar que el `requestMiddleware` principal también lo tenga al inicio.

Acción: Añadir guard `if (url.pathname.startsWith("/lovable/")) return next()` al inicio del request middleware.

## 3. Configurar Google OAuth (para login de usuarios)

No he podido verificar si Google Auth está activo. Los usuarios necesitan iniciar sesión para:
- Reclamar premios (la página de claim requiere auth)
- Tener su perfil persistente

Acción: Verificar y configurar Google como provider de auth social si no está activo.

## 4. Verificar cron job del sorteo diario

El cron job existe (`daily-roulette-draw`) pero ejecuta a `0 0,1 * * *` (00:00 y 01:00 UTC). Las 8:00 PM ET son 00:00 UTC en horario estándar y 01:00 UTC en horario de verano. Necesitamos confirmar que el horario es correcto para ambos casos.

Acción: Revisar y ajustar el schedule del cron si es necesario.

## 5. Probar flujo end-to-end

Una vez listo todo lo anterior, probar:
- Compra de estrellas → acreditación → participación en sorteo
- AMOE (participación gratuita)
- Sorteo diario → notificación por email → reclamo de premio

## Resumen del estado actual (ya funciona)

- Ruleta + compra de estrellas (Stripe checkout) ✅
- Webhook de pagos que acredita estrellas + prize pool ✅
- Sorteo diario con animación, countdown, confetti ✅
- AMOE con validaciones legales completas ✅
- Notificación automática al ganador por email ✅
- Flujo de reclamo del ganador (KYC, W-9) ✅
- Términos legales y reglas oficiales ✅
- Cierre de entradas 5 min antes del sorteo ✅
- Stripe Go-Live completado (acepta pagos reales) ✅
- Email infrastructure configurada ✅
- Todas las funciones RPC existen en la base de datos ✅
- Apple Pay / Google Pay (vía Stripe automático) ✅