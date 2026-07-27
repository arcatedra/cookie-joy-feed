import { createFileRoute, redirect } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export const Route = createFileRoute("/join/$code")({
  beforeLoad: ({ params }) => {
    const ref = params.code.toUpperCase().slice(0, 16);

    if (typeof window === "undefined") {
      // Server-side: persist via Set-Cookie so the cookie is present on the
      // very next request (auth flow), before any client JS runs.
      try {
        setCookie(REF_COOKIE, ref, {
          maxAge: NINETY_DAYS,
          path: "/",
          sameSite: "lax",
          secure: true,
          httpOnly: false,
        });
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
