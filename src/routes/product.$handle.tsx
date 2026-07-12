import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /product/:handle route — subscription model, no per-product page.
export const Route = createFileRoute("/product/$handle")({
  beforeLoad: () => {
    throw redirect({ to: "/subscribe" });
  },
});
