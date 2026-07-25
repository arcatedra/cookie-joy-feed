## Qué está pasando

En la página `/auth`, al montar el formulario se llama al server function `preflightLogin` (en `src/lib/login-security.functions.ts`). Ese function carga `supabaseAdmin` desde `src/integrations/supabase/client.server.ts`, que exige leer `process.env.SUPABASE_SERVICE_ROLE_KEY` en el runtime del servidor (Cloudflare Worker).

Ese valor **no está disponible en el runtime del servidor de la app** — por eso el toast dice:
> Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY. Connect Supabase in Lovable Cloud.

Aunque la lista de secrets muestra `SUPABASE_SERVICE_ROLE_KEY`, ese registro pertenece al proyecto Supabase (Edge Functions). Tras la migración a BYO Supabase (`oyvbxkluvkrljvewrgue`), el secret que necesita el server runtime de la app (TanStack Start / Cloudflare Worker) no quedó configurado con la service role key del nuevo proyecto.

Nota: el login en sí no depende de la service role key — solo la usan el rate-limit y el registro de intentos. El error se muestra como toast pero no impide el flujo si Supabase Auth responde. Aun así hay que resolverlo para que el rate-limit anti-brute-force funcione.

## Plan

1. Añadir/actualizar el secret `SUPABASE_SERVICE_ROLE_KEY` en el runtime de la app usando `add_secret`, apuntando al `service_role` del proyecto Supabase actual (`oyvbxkluvkrljvewrgue`). Se obtiene en:
   `https://supabase.com/dashboard/project/oyvbxkluvkrljvewrgue/settings/api` → "Project API keys" → `service_role`.
2. Confirmar también que `SUPABASE_URL` en el runtime apunte a `https://oyvbxkluvkrljvewrgue.supabase.co` (ya está en `.env`, pero verificar el secret del server).
3. Recargar `/auth` y comprobar que el toast desaparece y el preflight responde correctamente.

## Detalles técnicos

- Archivo relevante: `src/integrations/supabase/client.server.ts` lanza el error cuando faltan `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`.
- Callers en `/auth`: `getLoginSecurityConfig`, `preflightLogin`, `finalizeLoginAttempt` (`src/lib/login-security.functions.ts`).
- No hace falta cambiar código; es un problema de configuración de secrets del runtime.
