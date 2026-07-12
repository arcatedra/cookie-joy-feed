import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/join/$code")({
  beforeLoad: ({ params }) => {
    const ref = params.code.toUpperCase().slice(0, 16);
    throw redirect({
      to: "/auth",
      search: { ref, redirect: "/" },
    });
  },
});