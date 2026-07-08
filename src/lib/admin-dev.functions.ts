import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// DEV / TESTING ONLY — Admin-guarded server functions that let an admin
// activate or deactivate a fake Starter Plan subscription for any user
// (by email) WITHOUT going through Stripe checkout.
//
// Every function here re-checks `has_role(_role: 'admin')` server-side.
// Non-admin callers get a 403 even if they hit the endpoint directly.
// ---------------------------------------------------------------------------

const TEST_PRICE_ID = "plan_starter_monthly";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) {
    throw new Response("Forbidden", { status: 403 });
  }
}

async function resolveUserIdByEmail(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.trim().toLowerCase();

  // Try profiles first (public schema, safe to read).
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();
  if (profile?.id) return profile.id as string;

  // Fallback: scan auth.users via admin API.
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  throw new Error(`No se encontró un usuario con el correo ${email}`);
}

export const adminActivateTestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetUserId = await resolveUserIdByEmail(data.email);

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    // Fake Stripe ids marked with a `test_manual_` prefix so they're easy
    // to identify in the DB and never collide with real Stripe objects.
    const fakeSubId = `test_manual_${targetUserId}_${Date.now()}`;
    const fakeCustomerId = `test_manual_cus_${targetUserId}`;

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: targetUserId,
      stripe_subscription_id: fakeSubId,
      stripe_customer_id: fakeCustomerId,
      price_id: TEST_PRICE_ID,
      product_id: null,
      status: "active",
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      environment: "sandbox",
    });

    if (error) throw new Error(error.message);
    return { ok: true as const, userId: targetUserId };
  });

export const adminDeactivateTestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetUserId = await resolveUserIdByEmail(data.email);

    // Only touch manually-created test rows — never remove real Stripe subs.
    const { error, count } = await supabaseAdmin
      .from("subscriptions")
      .delete({ count: "exact" })
      .eq("user_id", targetUserId)
      .like("stripe_subscription_id", "test_manual_%");

    if (error) throw new Error(error.message);
    return { ok: true as const, removed: count ?? 0 };
  });
