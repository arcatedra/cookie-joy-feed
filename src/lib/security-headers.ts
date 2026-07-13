import { createMiddleware } from "@tanstack/react-start";

const NONCE_TRANSPORT_HEADER = "x-csp-nonce";

/**
 * Adds baseline HTTP security headers to every response served by the
 * TanStack Start worker.
 *
 * CSP is intentionally permissive around third parties we actually use
 * (Supabase, Stripe, Cloudflare Turnstile, Google OAuth, YouTube reels).
 * Tighten with reports before going stricter.
 *
 * Nonce handling: `getRouter()` generates a per-request CSP nonce and
 * exposes it via the temporary `x-csp-nonce` response header. We consume
 * that header here to compose the `script-src` directive, then strip it
 * from the final response.
 */
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const result = await next();
    const response = result.response;
    const headers = new Headers(response.headers);

    const nonce = headers.get(NONCE_TRANSPORT_HEADER) ?? undefined;
    if (nonce) headers.delete(NONCE_TRANSPORT_HEADER);

    const contentType = headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");

    // Always-safe headers (apply to every response, incl. JSON/asset)
    if (!headers.has("X-Content-Type-Options")) {
      headers.set("X-Content-Type-Options", "nosniff");
    }
    if (!headers.has("Referrer-Policy")) {
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    }
    if (!headers.has("Strict-Transport-Security")) {
      headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }
    if (!headers.has("Permissions-Policy")) {
      headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(self), payment=(self)",
      );
    }

    // HTML-only headers
    if (isHtml) {
      // Detect Lovable editor/preview iframe — allow framing there, DENY elsewhere.
      const host = new URL(request.url).host;
      const isLovablePreview =
        host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");

      if (!headers.has("X-Frame-Options")) {
        headers.set(
          "X-Frame-Options",
          isLovablePreview ? "SAMEORIGIN" : "DENY",
        );
      }

      if (!headers.has("Content-Security-Policy")) {
        const frameAncestors = isLovablePreview
          ? "'self' https://*.lovable.app https://*.lovable.dev"
          : "'self'";

        // script-src: NO 'unsafe-inline'. TanStack Router applies the nonce
        // above to every <script> it emits — SSR bootstrap, route scripts,
        // asset scripts, and JSON-LD blocks — via router.options.ssr.nonce.
        // 'strict-dynamic' lets those nonced scripts load their own
        // dependencies (Stripe.js, Turnstile widget). The https: allowlist
        // stays as a CSP2 fallback for browsers that ignore strict-dynamic.
        const scriptSrc = nonce
          ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://challenges.cloudflare.com https://*.supabase.co`
          : // Defensive fallback if the nonce was somehow not produced —
            // keep the old permissive directive rather than hard-breaking
            // the page. This branch should not fire in normal operation.
            "script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com https://*.supabase.co";

        const csp = [
          "default-src 'self'",
          scriptSrc,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' https: blob:",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://checkout.stripe.com",
          `frame-ancestors ${frameAncestors}`,
          "upgrade-insecure-requests",
        ].join("; ");

        headers.set("Content-Security-Policy", csp);
      }
    }

    return {
      ...result,
      response: new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }),
    };
  },
);
