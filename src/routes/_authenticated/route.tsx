import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Enforce 2FA for admins on admin routes.
    const path = location.pathname;
    if (path.startsWith("/admin")) {
      try {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        if (isAdmin) {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          const enforced = aal?.currentLevel === "aal2";
          if (!enforced) {
            throw redirect({
              to: "/profile/security",
              search: { enforce: "admin" },
            });
          }
        }
      } catch (err) {
        // Re-throw redirects; swallow other errors so we don't block non-admin paths.
        if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) throw err;
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
