import { createFileRoute, redirect } from "@tanstack/react-router";

// Hazorex ya no vende suscripciones: ahora se cobra por pedido.
// La dirección antigua lleva al listado de tiendas.
export const Route = createFileRoute("/subscribe")({
  beforeLoad: () => {
    throw redirect({ to: "/tiendas" });
  },
});
