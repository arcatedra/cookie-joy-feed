import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const REF_COOKIE = "hazorex_ref";

/**
 * If the current request carries a valid `hazorex_ref` cookie AND the
 * authenticated user's cliente row still has no referrer, attach the
 * referring profile permanently. Never overwrites an existing referrer.
 *
 * Server-only. Call from inside a server-function handler that already
 * verified auth (has `userId`).
 */
export async function attachReferralIfPending(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ attached: boolean }> {
  let ref: string | undefined;
  try {
    ref = getCookie(REF_COOKIE);
  } catch {
    return { attached: false };
  }
  if (!ref) return { attached: false };
  const code = ref.toUpperCase().slice(0, 16);

  const { supabase, userId } = params;

  // Only act when the cliente row exists and has no referrer yet.
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, referred_by_profile_id")
    .eq("id", userId)
    .maybeSingle();
  if (!cliente || cliente.referred_by_profile_id) {
    // Existing referrer wins forever; drop the stale cookie.
    try { deleteCookie(REF_COOKIE, { path: "/" }); } catch { /* noop */ }
    return { attached: false };
  }

  // Resolve profile by referral_code with elevated privileges (RLS on profiles
  // is per-owner). Never self-refer.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  if (!prof || prof.id === userId) {
    try { deleteCookie(REF_COOKIE, { path: "/" }); } catch { /* noop */ }
    return { attached: false };
  }

  const { error } = await supabaseAdmin
    .from("clientes")
    .update({ referred_by_profile_id: prof.id })
    .eq("id", userId)
    .is("referred_by_profile_id", null); // race-safe: never overwrite
  if (error) {
    console.warn("[referrals] attach failed", error.message);
    return { attached: false };
  }

  try { deleteCookie(REF_COOKIE, { path: "/" }); } catch { /* noop */ }
  return { attached: true };
}
