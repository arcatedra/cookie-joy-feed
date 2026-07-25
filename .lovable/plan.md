## Situación

Conectaste Supabase en Cloud (UI muestra "Connected" con proyecto HAZOREX). Sin embargo, `fetch_secrets` en el runtime del server **no muestra** `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY`. `src/integrations/supabase/client.server.ts` lee `process.env.SUPABASE_URL` y `process.env.SUPABASE_SERVICE_ROLE_KEY`, así que sigue lanzando el toast en `/auth` porque el runtime del Worker no los tiene.

Es decir: el conector marca "Connected" pero **no inyectó los env vars del server** (solo los `VITE_*` del cliente, que ya están en `.env`).

## Plan

1. **Verificar en preview** si el error persiste ahora que reconectaste. A veces la reconexión requiere que el server rebootee para recoger los nuevos env vars. Abrir `/auth` y revisar consola/toast + logs de server con `server-function-logs` sobre `preflightLogin` / `getLoginSecurityConfig`.

2. **Si el error ya desapareció** → cerrado, no hace falta código.

3. **Si el error persiste** (probable, dado que los secrets del server no aparecen listados): aplicar el workaround de código, ya que las herramientas de secrets no pueden crear/editar variables reservadas por el conector:
   - Añadir dos secrets no reservados vía `add_secret` para que tú los pegues por formulario seguro:
     - `APP_SUPABASE_URL` → `https://oyvbxkluvkrljvewrgue.supabase.co`
     - `APP_SUPABASE_SERVICE_ROLE_KEY` → service_role del dashboard Supabase (Settings → API).
   - Modificar `src/integrations/supabase/client.server.ts` para leer con fallback:
     `process.env.SUPABASE_URL ?? process.env.APP_SUPABASE_URL` y
     `process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.APP_SUPABASE_SERVICE_ROLE_KEY`.
   - Sin cambios en otros llamadores; el resto del código sigue usando `supabaseAdmin`.

4. **Verificar**: abrir `/auth` en preview, confirmar que no aparece el toast "Missing Supabase environment variable(s)" y que el preflight (rate-limit) responde 200 en `server-function-logs`.

## Detalles técnicos

- No se toca la tabla `secrets` de Supabase ni el conector.
- Los secrets `APP_*` son de usuario (no *managed*), por lo que `add_secret` puede pedirlos por formulario seguro sin conflicto con la gestión del conector.
- El fallback preserva la ruta ideal: si en el futuro el conector empieza a inyectar `SUPABASE_SERVICE_ROLE_KEY` en el runtime, se usará esa automáticamente; los `APP_*` quedan como respaldo.
- No hay cambios en el cliente browser (`src/integrations/supabase/client.ts`) — ya funciona con los `VITE_*`.
