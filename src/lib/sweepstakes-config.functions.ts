import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLACEHOLDER_RE = /\[.*?\]|completar/i;

export function isSponsorAddressValid(addr: string | null | undefined): boolean {
  if (!addr) return false;
  const trimmed = addr.trim();
  if (trimmed.length < 10) return false;
  if (PLACEHOLDER_RE.test(trimmed)) return false;
  return true;
}

/** Public, anonymous-friendly read used by public pages (rules, banners). */
export const getSweepstakesPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("get_sweepstakes_public_config");
  if (error) {
    console.error("[sweepstakes] public config error", error);
    return {
      sponsor_name: "HAZOREX LLC",
      sponsor_address: "",
      sponsor_email: "soporte@hazorex.com",
      excluded_states: ["FL", "RI"] as string[],
      min_age: 18,
      claim_window_days: 14,
      max_daily_prize_usd: 4999,
      address_valid: false,
      sweepstakes_active: false,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    sponsor_name: (row?.sponsor_name as string) ?? "HAZOREX LLC",
    sponsor_address: (row?.sponsor_address as string) ?? "",
    sponsor_email: (row?.sponsor_email as string) ?? "soporte@hazorex.com",
    excluded_states: ((row?.excluded_states as string[]) ?? ["FL", "RI"]),
    min_age: Number(row?.min_age ?? 18),
    claim_window_days: Number(row?.claim_window_days ?? 14),
    max_daily_prize_usd: Number(row?.max_daily_prize_usd ?? 4999),
    address_valid: Boolean(row?.address_valid ?? false),
    sweepstakes_active: Boolean(row?.sweepstakes_active ?? false),
  };
});


export const getSweepstakesConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sweepstakes_config")
    .select("sponsor_name, sponsor_address, sponsor_email, excluded_states, min_age, claim_window_days, entry_cutoff_minutes, max_daily_prize_usd, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    ...data!,
    address_valid: isSponsorAddressValid(data?.sponsor_address ?? null),
  };
});

const US_STATE_RE = /^[A-Z]{2}$/;

const UpdateSchema = z.object({
  sponsor_name: z.string().trim().min(2).max(200),
  sponsor_address: z
    .string()
    .trim()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(500)
    .refine((v) => !PLACEHOLDER_RE.test(v), "La dirección no puede contener marcadores como [COMPLETAR]"),
  sponsor_email: z.string().trim().email().max(200),
  max_daily_prize_usd: z.number().min(1).max(1000000),
  excluded_states: z
    .array(z.string().trim().toUpperCase().regex(US_STATE_RE, "Estado inválido"))
    .max(50),
});

export const updateSweepstakesConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      throw new Error("Solo administradores pueden actualizar la configuración del sorteo.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sweepstakes_config")
      .update({
        sponsor_name: data.sponsor_name,
        sponsor_address: data.sponsor_address,
        sponsor_email: data.sponsor_email,
        max_daily_prize_usd: data.max_daily_prize_usd,
        excluded_states: data.excluded_states,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
