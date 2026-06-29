## Publicar hazorex.com

Desplegar la versión actual a producción para que el cambio de remitente (`noreply@notify.hazorex.com`) quede activo en la web live.

### Pasos
1. Ejecutar scan de seguridad para confirmar que no hay findings críticos bloqueantes.
2. Publicar el proyecto en hazorex.com (mismo dominio ya conectado, solo se actualiza el build).
3. Confirmar al usuario que el deploy tarda ~1 minuto.

### Después del deploy (acción del usuario)
- Hacer una compra real de $1 en https://hazorex.com.
- Compartir el `session_id` de la URL `/checkout/success`.
- Verificaré en BD: `orders.status='paid'`, `email_send_log` con `order-confirmation` en `sent`, y que el correo llegó desde `noreply@notify.hazorex.com`.
