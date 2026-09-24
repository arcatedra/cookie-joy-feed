import { createFileRoute, redirect } from "@tanstack/react-router";

// Las entregas ya no dependen de un plan: el día se elige al pagar cada pedido.
export const Route = createFileRoute("/_authenticated/deliveries")({
  beforeLoad: () => {
    throw redirect({ to: "/mis-pedidos" });
  },
});
