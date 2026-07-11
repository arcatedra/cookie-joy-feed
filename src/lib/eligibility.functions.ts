import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const US_STATE = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/, "Estado inválido");
const DOB = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida");

function yearsBetween(dobIso: string, now: Date): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return -1;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const mo = now.getUTCMonth() - dob.getUTCMonth();
  if (mo < 0 || (mo === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

async function getUserIdFromBearer(): Promise<string | null> {
  try {
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: claims } = await sb.auth.getClaims(token);
    return (claims?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function loadEligibilityRules(): Promise<{ excludedStates: string[]; minAge: number }> {
  let excludedStates: string[] = ["FL", "RI"];
  let minAge = 18;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: cfg } = await sb.rpc("get_sweepstakes_public_config");
    const row = Array.isArray(cfg) ? cfg[0] : cfg;
    if (row?.excluded_states) excludedStates = (row.excluded_states as string[]).map((s) => s.toUpperCase());
    if (row?.min_age) minAge = Number(row.min_age);
  } catch {
    /* defaults */
  }
  return { excludedStates, minAge };
}

export const getMyEligibility = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getUserIdFromBearer();
  if (!userId) return { verified: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_eligibility")
    .select("dob, state, verified_age, verified_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { verified: false as const };
  return {
    verified: true as const,
    dob: data.dob as string,
    state: data.state as string,
    verifiedAge: data.verified_age as number,
    verifiedAt: data.verified_at as string,
  };
});

export const saveMyEligibility = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ dob: DOB, state: US_STATE }).parse(d),
  )
  .handler(async ({ data }) => {
    const userId = await getUserIdFromBearer();
    if (!userId) throw new Error("Debes iniciar sesión.");

    const declaredState = data.state.toUpperCase();
    const { excludedStates, minAge } = await loadEligibilityRules();

    const age = yearsBetween(data.dob, new Date());
    if (age < 0) throw new Error("Fecha de nacimiento inválida.");
    if (age < minAge) {
      throw new Error(`Debes tener al menos ${minAge} años.`);
    }
    if (excludedStates.includes(declaredState)) {
      throw new Error("El sorteo no está disponible en tu estado.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify only once: if a row already exists, return it unchanged.
    const { data: existing } = await supabaseAdmin
      .from("user_eligibility")
      .select("dob, state, verified_age, verified_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return {
        verified: true as const,
        dob: existing.dob as string,
        state: existing.state as string,
        verifiedAge: existing.verified_age as number,
        verifiedAt: existing.verified_at as string,
      };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("user_eligibility")
      .insert({
        user_id: userId,
        dob: data.dob,
        state: declaredState,
        verified_age: age,
      })
      .select("dob, state, verified_age, verified_at")
      .single();

    if (error || !inserted) throw new Error("No pudimos guardar la verificación.");

    return {
      verified: true as const,
      dob: inserted.dob as string,
      state: inserted.state as string,
      verifiedAge: inserted.verified_age as number,
      verifiedAt: inserted.verified_at as string,
    };
  });
