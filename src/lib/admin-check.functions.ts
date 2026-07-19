import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Lightweight admin probe kept in its own module so the sweepstakes bundle
// never pulls the admin-draw actions (triggerTestDraw, smoke tests, etc.).
// No middleware: guests get { isAdmin: false } instead of a 401.
export const checkIsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const authHeader = getRequestHeader("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { isAdmin: false };

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return { isAdmin: false };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userRes.user.id,
    _role: "admin",
  });
  if (error) return { isAdmin: false };
  return { isAdmin: !!data };
});
