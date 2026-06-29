# Aviso "El sorteo gira en 5 minutos"

Objetivo: 5 minutos antes de que gire la ruleta del sorteo diario, todos los usuarios registrados reciben un aviso simultáneo por tres canales para que entren en vivo y vivan la tensión del giro.

## Qué se construye

### 1. Push notifications del navegador (canal principal)
- Banner discreto en la home y en `/ruleta` pidiendo permiso: "Activa avisos para no perderte el giro en vivo".
- Al aceptar, se guarda la suscripción Web Push (endpoint + keys p256dh/auth) en una nueva tabla `push_subscriptions` ligada al `user_id`.
- Funciona en Chrome/Edge/Firefox desktop y Android. En iOS solo funciona si el usuario añadió la web a la pantalla de inicio (se lo explicamos en el banner).
- Click en la notificación → abre directamente la pantalla del sorteo en vivo.

### 2. Email de respaldo
- A todos los usuarios registrados con email verificado y que no estén en la lista de suppressed.
- Asunto: "🎰 El sorteo gira en 5 minutos — entra ahora".
- Botón grande "Ver el giro en vivo" que lleva al sorteo.
- Usa la infraestructura de Lovable Emails que ya tienes montada (cola `transactional_emails`).

### 3. Banner in-app para los que ya están dentro
- Toast/banner llamativo en la parte superior con cuenta regresiva (5:00 → 0:00) y botón "Ir al sorteo en vivo".
- Aparece en cualquier ruta donde esté el usuario.

### 4. Disparador automático
- Un cron job (pg_cron) que se ejecuta cada minuto, mira la hora del próximo sorteo en `sweepstakes_config`, y cuando faltan exactamente 5 minutos dispara los tres canales en paralelo.
- Idempotente: marca el sorteo del día como "avisado" para no enviar dos veces si el cron corre dos veces.

### 5. Preferencias del usuario
- Toggle en el perfil: "Avísame 5 min antes del sorteo" (activado por defecto al aceptar push, desactivable).
- Link de unsubscribe en el email (usa la tabla `email_unsubscribe_tokens` existente).

## Detalles técnicos

- **Nueva tabla** `push_subscriptions` (user_id, endpoint, p256dh, auth, created_at) con RLS y GRANTs.
- **Nueva columna** en `profiles`: `notify_before_draw boolean default true`.
- **Nueva columna** en `daily_draws`: `notified_5min_at timestamptz` para idempotencia.
- **Server route público** `/api/public/hooks/notify-pre-draw` que el cron invoca; valida con `apikey` header.
- **Server function** `sendPushNotification` que firma con VAPID y hace POST al endpoint de cada suscripción (librería `web-push` compatible con Worker, o llamada fetch directa firmando JWT VAPID).
- **Claves VAPID**: se generan una vez con `generate_secret` y se guardan como `VAPID_PUBLIC_KEY` (también expuesta como `VITE_VAPID_PUBLIC_KEY` para el cliente) y `VAPID_PRIVATE_KEY` (server-only).
- **Service Worker** nuevo en `public/sw.js` que escucha el evento `push` y muestra la notificación.
- **Cron** cada minuto vía `pg_cron` + `pg_net`.
- **Banner in-app** consulta cada 30s la hora del próximo sorteo (o vía Realtime sobre `daily_draws`) y aparece solo en la ventana de los últimos 5 min.

## Limitaciones honestas

- **iOS Safari**: las push solo llegan si el usuario instaló la web como PWA. No hay forma de evitarlo, es restricción de Apple.
- **Tasa de aceptación de push**: típicamente 20-40% acepta el permiso. Por eso van los 3 canales.
- **Email a "todos los registrados"**: si tienes muchos usuarios inactivos, puede afectar tu reputación de envío. Recomendación a futuro (no en este plan): pasar a opt-in explícito una vez tengas base.

## Fuera de alcance

- Notificaciones SMS (requeriría Twilio o similar, coste por mensaje).
- Notificaciones push nativas iOS sin PWA (imposible técnicamente).
- Cambiar la lógica del sorteo o de la ruleta personal.
