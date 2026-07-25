import { createServerFn } from "@tanstack/react-start";

type ProviderId =
  | "google"
  | "apple"
  | "azure"
  | "facebook"
  | "github"
  | "gitlab"
  | "discord"
  | "twitter";

export const checkAuthProviderEnabled = createServerFn({ method: "POST" })
  .inputValidator((data: { provider: ProviderId }) => data)
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL ?? process.env.APP_SUPABASE_URL;
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.APP_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        ok: false as const,
        enabled: false,
        error: "server_misconfigured" as const,
        message:
          "El servidor no puede verificar los proveedores de auth (faltan variables SUPABASE_URL/PUBLISHABLE_KEY).",
      };
    }
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      if (!res.ok) {
        return {
          ok: false as const,
          enabled: false,
          error: "fetch_failed" as const,
          message: `No se pudo consultar Supabase Auth (HTTP ${res.status}).`,
        };
      }
      const json = (await res.json()) as {
        external?: Record<string, boolean | undefined>;
      };
      const enabled = Boolean(json.external?.[data.provider]);
      return {
        ok: true as const,
        enabled,
        message: enabled
          ? "ok"
          : `El proveedor "${data.provider}" no está habilitado en Supabase Authentication → Providers. Habilítalo y configura el Client ID/Secret para poder iniciar sesión.`,
      };
    } catch (err) {
      return {
        ok: false as const,
        enabled: false,
        error: "exception" as const,
        message:
          err instanceof Error
            ? `Error verificando proveedor: ${err.message}`
            : "Error verificando proveedor.",
      };
    }
  });
