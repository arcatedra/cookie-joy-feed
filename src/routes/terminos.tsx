import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy Spanish-only Terms document. The canonical Terms of Service lives at
// /terms (fully i18n-translated). Redirect any traffic (footer, old links,
// bookmarks, search engines) to the single canonical document.
export const Route = createFileRoute("/terminos")({
  beforeLoad: () => {
    throw redirect({ to: "/terms" });
  },
});
