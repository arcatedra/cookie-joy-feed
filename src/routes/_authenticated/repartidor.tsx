import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DriverLayout } from "@/components/DriverLayout";

export const Route = createFileRoute("/_authenticated/repartidor")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw redirect({ to: "/auth" });

    const { data: driver } = await supabase
      .from("drivers")
      .select("application_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!driver) {
      throw redirect({ to: "/repartidores" });
    }
    if (driver.application_status !== "aprobado") {
      throw redirect({ to: "/repartidores" });
    }
  },
  component: () => (
    <DriverLayout>
      <Outlet />
    </DriverLayout>
  ),
});
