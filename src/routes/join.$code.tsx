import { createFileRoute, redirect } from "@tanstack/react-router";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export const Route = createFileRoute("/join/$code")({
  beforeLoad: async ({ params }) => {
    const ref = params.code.toUpperCase().slice(0, 16);
    const valid = /^[A-HJ-NP-Z2-9]{8}$/.test(ref);

    if (typeof window === "undefined") {
      if (!valid) {
        throw redirect({ to: "/auth", search: { redirect: "/" } });
      }
      try {
        const { setReferralCookie } = await import("@/lib/join-cookie.server");
        setReferralCookie(ref);
      } catch {
        // Non-fatal: cookie is best-effort for attribution.
      }
      throw redirect({
        to: "/auth",
        search: { ref, redirect: "/subscribe" },
      });
    }

    // Client-side: set the cookie then redirect.
    if (valid) {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax; Secure`;
    }
    throw redirect({
      to: "/auth",
      search: valid ? { ref, redirect: "/subscribe" } : { redirect: "/" },
    });
  },
});
