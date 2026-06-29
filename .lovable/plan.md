## 1. Revertir el logo del header (página principal)

En el último cambio sustituí el símbolo del header de la home (`TopNav.tsx`) por una imagen nueva (`hazorex-symbol-new.png`). Eso no me lo pediste — perdón.

Lo que voy a hacer:
- En `src/components/TopNav.tsx`, dejar de usar `HazorexSymbol` y volver al símbolo anterior (`hazorex-symbol-only.png`, el que usabas antes de tocar nada).
- No tocar el favicon ni la metadata OG (esos sí los pediste y siguen con el logo dorado oficial).
- No tocar `auth.tsx` ni los demás sitios donde el logo está bien.

Resultado: la home vuelve a verse exactamente como antes de mi cambio.

## 2. Pantalla "Acceder con Google" (Lovable / logo de corazón)

Eso **no es código**. Esa pantalla la dibuja Google, y muestra el nombre y logo del **OAuth Client** que se está usando. Ahora mismo se está usando el de Lovable (gestionado por defecto), por eso ves "Lovable" y su corazón.

Tú ya creaste tu propio OAuth Client en Google Cloud con el nombre **Hazorex** y tu logo dorado — perfecto. Falta el último paso, que **solo tú puedes hacer** (yo no tengo acceso a ese panel):

1. Abre el backend con el botón de abajo.
2. Ve a **Users → Auth Settings (engranaje) → Sign In Methods → Google**.
3. Cambia el modo de "Use Lovable-managed credentials" a **"Use my own credentials"**.
4. Pega ahí:
   - **Client ID** (termina en `.apps.googleusercontent.com`)
   - **Client Secret** (empieza por `GOCSPX-...`)
5. Copia el **Authorized redirect URI** que te muestra esa misma pantalla y verifica que está EXACTAMENTE igual en Google Cloud → Credentials → tu OAuth Client → Authorized redirect URIs. Si falta o sobra una barra, Google rechaza con `redirect_uri_mismatch`.
6. Guarda.

A partir de ese momento, la pantalla de Google dirá **"Acceder con Hazorex"** con tu logo dorado en vez de "Lovable". Si sigues viendo Lovable: cierra la pestaña, espera 30 s y reintenta (caché del navegador).

## Detalles técnicos

Archivos modificados en esta tarea: solo `src/components/TopNav.tsx` (1 import + 2 líneas JSX, volver al componente de símbolo anterior). Cero cambios de backend, cero cambios de auth, cero cambios de assets.