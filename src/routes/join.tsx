import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({
    ref: typeof search.ref === "string" ? search.ref.toUpperCase().slice(0, 16) : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: { ref: search.ref, redirect: "/" },
    });
  },
});
