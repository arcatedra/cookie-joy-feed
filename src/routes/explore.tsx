import { createFileRoute, redirect } from "@tanstack/react-router";

// /explore era un duplicado visual de /shop (mismo catálogo, mismo layout de
// grid en dos columnas, mismos productos). Se consolidó en /shop para tener
// una única fuente de verdad del catálogo. Esta ruta permanece como redirect
// permanente para no romper enlaces existentes.
export const Route = createFileRoute("/explore")({
  beforeLoad: () => {
    throw redirect({ to: "/shop", replace: true });
  },
  component: () => null,
});
