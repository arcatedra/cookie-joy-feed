import { createFileRoute, redirect } from "@tanstack/react-router";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export const Route = createFileRoute("/join/$code")({
  beforeLoad: async ({ params }) => {
    const ref = params.code.toUpperCase().slice(0, 16);

    if (typeof window === "undefined") {
      try {
        const mod = "@/lib/join-cookie.server";
        const { setReferralCookie } = await import(/* @vite-ignore */ mod);
        setReferralCookie(ref);
      } catch {
        // Non-fatal: client fallback below still runs on hydration.
      }
    } else {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax; Secure`;
    }

    throw redirect({
      to: "/auth",
      search: { ref, redirect: "/" },
    });
  },
});
