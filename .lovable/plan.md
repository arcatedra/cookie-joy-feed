## Objetivo

Evitar que `src/integrations/supabase/client.ts` acceda a `localStorage` durante SSR (que causó `ReferenceError: localStorage is not defined` y pantalla en blanco), manteniendo la persistencia de sesión en el navegador.

## Estado actual

- `src/integrations/supabase/client.ts` ya tiene un guard `typeof window !== "undefined" ? window.localStorage : undefined` en `auth.storage` (aplicado en el turno anterior).
- El error se disparaba porque `auth-attacher.ts` y `start.ts` importan el cliente y este se evalúa en el runtime del servidor.

## Cambios propuestos

1. **`src/integrations/supabase/client.ts`**
   - Confirmar el guard de `storage`.
   - Añadir `persistSession` y `autoRefreshToken` condicionados a `typeof window !== "undefined"` para que en SSR no se intenten refrescos ni escrituras de sesión.
   - Añadir `detectSessionInUrl: typeof window !== "undefined"` por consistencia.

2. **Verificación**
   - Recargar `/` y confirmar que no hay `ReferenceError` en consola del servidor.
   - Iniciar sesión y confirmar que la sesión persiste tras recargar (comportamiento cliente intacto).

## Detalles técnicos

```ts
const isBrowser = typeof window !== "undefined";
createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: isBrowser ? window.localStorage : undefined,
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
  },
});
```

Esto es el patrón isomórfico estándar: el mismo módulo se importa en servidor y cliente, pero solo el cliente toca `localStorage`. No requiere cambios en `auth-attacher.ts`, `start.ts` ni rutas.
