# Conectar tu OAuth Client de Hazorex a Lovable Cloud

Ya tienes el OAuth Client creado en Google Cloud con el nombre, logo y dominios de Hazorex. Falta enchufar esas credenciales en el backend para que sustituyan a las de Lovable.

## Lo que voy a hacer

1. **Guardar de forma segura** tus dos credenciales como secretos del proyecto:
   - `GOOGLE_OAUTH_CLIENT_ID` — el Client ID que te dio Google Cloud
   - `GOOGLE_OAUTH_CLIENT_SECRET` — el Client Secret que te dio Google Cloud
   
   Te abriré un formulario seguro para pegarlos. **Nunca los pegues en el chat.**

2. **Activar el proveedor Google en Lovable Cloud** usando esas credenciales (en lugar de las gestionadas por defecto), para que la pantalla de "Acceder con Google" muestre **Hazorex + tu logo dorado** en vez de "Lovable".

## Lo que necesito de ti

- El **Client ID** (termina en `.apps.googleusercontent.com`)
- El **Client Secret** (cadena tipo `GOCSPX-...`)

Los encuentras en Google Cloud Console → **APIs & Services → Credentials → tu OAuth 2.0 Client ID** (botón de descarga / "Show client secret").

## Verificación final

Después de guardarlos:
- La próxima vez que abras la pantalla de login con Google aparecerá **"Acceder con Hazorex"** con tu logo.
- Si sigue saliendo "Lovable", suele ser cache del navegador → cerrar pestaña, esperar 30 s y reintentar.

## Importante

- El **redirect URI** que pusiste en Google Cloud debe coincidir EXACTAMENTE con el que muestra Lovable Cloud en Users → Auth Settings → Google. Si no coincide, Google rechaza con `redirect_uri_mismatch`.
- No tocaremos código de la app: el cambio es puramente de configuración del backend de auth.
