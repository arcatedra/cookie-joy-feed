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

export const getSweepstakesConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sweepstakes_config")
    .select("sponsor_name, sponsor_address, sponsor_email, excluded_states, min_age, claim_window_days, entry_cutoff_minutes, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    ...data!,
    address_valid: isSponsorAddressValid(data?.sponsor_address ?? null),
  };
});

const UpdateSchema = z.object({
  sponsor_name: z.string().trim().min(2).max(200),
  sponsor_address: z
    .string()
    .trim()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(500)
    .refine((v) => !PLACEHOLDER_RE.test(v), "La dirección no puede contener marcadores como [COMPLETAR]"),
  sponsor_email: z.string().trim().email().max(200),
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
