# Quitar "Lovable" de la pantalla de inicio de sesión con Google

## El problema

La pantalla "Acceder con Google" muestra el nombre **Lovable** y el corazón porque la app está usando las credenciales OAuth compartidas y gestionadas por Lovable. Google muestra el nombre y logo del proyecto OAuth **dueño del Client ID** — no se puede cambiar desde el código de la app. La única solución es usar credenciales OAuth propias en tu cuenta de Google Cloud.

Una vez hecho, la pantalla mostrará:
- **Hazorex** en lugar de Lovable
- **Tu logo** en lugar del corazón
- **hazorex.com** como sitio oficial
- Enlaces a tu Política de Privacidad y Términos

Resultado: indistinguible de cualquier app profesional. Nadie sabrá con qué herramienta se construyó.

## Lo que tú haces (en Google Cloud — guiado paso a paso)

1. Crear proyecto en Google Cloud Console llamado **Hazorex**.
2. Configurar la **OAuth consent screen**:
   - App name: `Hazorex`
   - User support email: tu email
   - App logo: subir tu logo cuadrado (mín. 120×120, PNG)
   - Application home page: `https://hazorex.com`
   - Privacy policy: `https://hazorex.com/privacidad` (o la que indiques)
   - Terms of service: `https://hazorex.com/terminos`
   - Authorized domains: `hazorex.com`
   - Scopes: `email`, `profile`, `openid`
3. Crear **OAuth Client ID** (tipo Web application):
   - Authorized redirect URI: la URL de callback que te daré desde la configuración de auth del backend (formato `https://<proyecto>.supabase.co/auth/v1/callback`).
4. Copiar **Client ID** y **Client Secret** y pegármelos cuando te los pida.
5. Publicar la app OAuth (estado "In production") para que cualquier usuario pueda iniciar sesión sin la advertencia de "app no verificada".

> Nota sobre verificación: Google puede pedir verificación oficial (proceso de días/semanas, gratis) si superas ~100 usuarios o pides scopes sensibles. Con `email/profile/openid` el proceso es ligero o no requerido.

## Lo que yo hago (en la app)

1. Crear las rutas legales mínimas si no existen, para que los enlaces de la pantalla de Google funcionen:
   - `/privacidad` — Política de Privacidad básica de Hazorex.
   - `/terminos` — Términos del Servicio básicos de Hazorex.
2. Una vez me pases Client ID + Client Secret, guardarlos de forma segura y configurarlos como las credenciales del proveedor Google en el backend de auth (sustituyendo las credenciales gestionadas por Lovable).
3. Verificar el flujo: hacer logout y volver a iniciar sesión con Google; confirmar que la pantalla muestra **Hazorex + tu logo + hazorex.com** y ya no aparece Lovable.

## Fuera de alcance

- No tocaré la lógica de la app, el sorteo, ni nada visual fuera de las dos páginas legales nuevas.
- No puedo eliminar la marca Lovable de la URL de callback de Google (es la del backend, no visible para el usuario final).
- No registro tu app en Google ni acepto los Términos por ti — eso solo lo puedes hacer tú con tu cuenta Google.

## Orden de ejecución sugerido

1. Apruebas este plan.
2. Yo creo las páginas `/privacidad` y `/terminos` y te paso la URL de callback exacta para Google.
3. Tú haces los pasos en Google Cloud y me devuelves Client ID + Secret.
4. Yo los configuro en el backend y verificamos juntos el resultado.
