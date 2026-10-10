import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /product/:handle route — retained link to the current cookie catalog.
export const Route = createFileRoute("/product/$handle")({
  beforeLoad: () => {
    throw redirect({ to: "/shop" });
  },
});
