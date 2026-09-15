import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/DriverLayout";

// Cache the approval check for the session so moving between driver screens
// doesn't wait on two network round-trips every single time.
let gateCache: { userId: string; approved: boolean; at: number } | null = null;
const GATE_TTL_MS = 5 * 60 * 1000;

export const Route = createFileRoute("/_authenticated/repartidor")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw redirect({ to: "/auth" });

    if (
      gateCache &&
      gateCache.userId === user.id &&
      gateCache.approved &&
      Date.now() - gateCache.at < GATE_TTL_MS
    ) {
      return;
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("application_status")
      .eq("id", user.id)
      .maybeSingle();

    const approved = driver?.application_status === "aprobado";
    gateCache = { userId: user.id, approved, at: Date.now() };

    if (!approved) {
      throw redirect({ to: "/repartidores" });
    }
  },
  component: () => (
    <DriverLayout>
      <Outlet />
    </DriverLayout>
  ),
});
