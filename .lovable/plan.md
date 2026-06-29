## Qué está pasando

El error `redirect_uri_mismatch` significa que Google está recibiendo una URL de regreso distinta a la que pusiste en Google Cloud. No sirve copiar una URL de ejemplo ni inventarla: tiene que ser exactamente la URL que muestra el backend en la configuración de Google.

## Plan para arreglarlo

1. Abrir el backend de Lovable.
2. Ir a **Users → Auth Settings → Sign In Methods → Google**.
3. Abrir la configuración de Google y copiar el campo exacto llamado **Callback URL**, **Redirect URL** o **Authorized redirect URI**.
4. En Google Cloud → **APIs & Services → Credentials → tu OAuth Client ID**, borrar la URL anterior en **Authorized redirect URIs**.
5. Pegar exactamente la URL copiada del backend, sin agregar ni quitar nada:
   - mismo `https://`
   - mismo dominio
   - mismo path
   - sin espacios
   - sin barra extra al final si no aparece
6. Guardar en Google Cloud y esperar 1–2 minutos.
7. Volver al backend y confirmar que están pegados tu **Client ID** y **Client Secret** propios, no los administrados por Lovable.
8. Probar de nuevo el botón **Acceder con Google**.

## Importante

No puedo ver desde aquí el valor exacto de esa URL privada del panel. Si quieres, mándame una captura tapando el Client Secret, pero dejando visible solamente el campo de **Callback URL / Redirect URL**, y te digo exactamente cuál línea debes copiar.