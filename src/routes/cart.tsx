import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /cart route — the store is subscription-based, payments go through
// Stripe on /subscribe. Any lingering link to /cart lands users there.
export const Route = createFileRoute("/cart")({
  beforeLoad: () => {
    throw redirect({ to: "/subscribe" });
  },
});
