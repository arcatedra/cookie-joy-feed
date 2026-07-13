import { createMiddleware } from "@tanstack/react-start";
import { generateCspNonce, runWithCspNonce } from "./csp-nonce";

/**
 * Adds baseline HTTP security headers to every response served by the
 * TanStack Start worker.
 *
 * Per-request CSP nonce: generated here, shared with `getRouter()` via
 * AsyncLocalStorage (see `./csp-nonce`) so TanStack Router stamps the same
 * nonce onto every inline `<script>` it emits. That lets us drop
 * `'unsafe-inline'` from `script-src` entirely while still allowing the
 * SSR bootstrap, route data, and JSON-LD blocks to execute.
 */
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const nonce = generateCspNonce();
    const result = await runWithCspNonce(nonce, () => next());
    const response = result.response;
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

        // script-src: NO 'unsafe-inline'. TanStack Router stamps this same
        // nonce on every inline script via `router.options.ssr.nonce`.
        // 'strict-dynamic' lets those nonced scripts load their own deps
        // (Stripe.js, Turnstile). The https: allowlist stays as a CSP2
        // fallback for browsers that ignore strict-dynamic.
        const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://challenges.cloudflare.com https://*.supabase.co`;

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
