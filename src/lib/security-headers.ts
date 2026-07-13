import { createMiddleware } from "@tanstack/react-start";

/**
 * Adds baseline HTTP security headers to every response served by the
 * TanStack Start worker.
 *
 * CSP is intentionally permissive around third parties we actually use
 * (Supabase, Stripe, Cloudflare Turnstile, Google OAuth, YouTube reels).
 * Tighten with reports before going stricter.
 */
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const response = await next();
    const headers = new Headers(response.headers);

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

        const csp = [
          "default-src 'self'",
          // 'unsafe-inline' + 'unsafe-eval' required by TanStack Start SSR
          // bootstrap script and third-party widgets (Stripe, Turnstile).
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com https://*.supabase.co",
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

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
);
