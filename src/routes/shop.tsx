import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /shop route — the store is subscription-based. Redirect to /subscribe.
export const Route = createFileRoute("/shop")({
  beforeLoad: () => {
    throw redirect({ to: "/subscribe" });
  },
});
