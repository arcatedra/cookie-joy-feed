import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/confianza")({
  beforeLoad: () => {
    throw redirect({ to: "/trust", statusCode: 301 });
  },
});
