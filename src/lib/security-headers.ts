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

        // style-src: NO 'unsafe-inline'. Our own inline <style> blocks use
        // <NoncedStyle> which stamps the per-request nonce. Sonner injects a
        // ~15KB runtime <style> at module load with no nonce hook — we allow
        // that one specific block via its SHA-256 hash (stable per package
        // version; bump when upgrading `sonner`).
        // 'unsafe-hashes' + hashes cover inline handlers/attrs only; style
        // attributes on JSX elements (React `style={{}}`) are governed by
        // style-src-attr — we keep 'unsafe-inline' there because per-attr
        // hashing is impractical for 400+ dynamic style attributes.
        const sonnerCssHash = "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='";
        // React 19 emits empty <style> shells for `<link precedence>` hoisting; SHA-256 of "".
        const emptyStyleHash = "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='";
        const inlineStyleHashes = `${sonnerCssHash} ${emptyStyleHash}`;
        const styleSrcElem = `style-src-elem 'self' 'nonce-${nonce}' ${inlineStyleHashes} https://fonts.googleapis.com`;
        const styleSrc = `style-src 'self' 'nonce-${nonce}' ${inlineStyleHashes} https://fonts.googleapis.com`;


        const csp = [
          "default-src 'self'",
          scriptSrc,
          styleSrc,
          styleSrcElem,
          // style-src-attr: documented exception. React + Radix/shadcn (Progress,
          // Sidebar, Sheet, Chart, Tooltip, Popover, Select, Dialog), Embla
          // Carousel, Sonner toast positioning, Recharts and 600+ project
          // `style={{}}` attributes emit per-attribute inline styles at runtime
          // with dynamic values (transforms, widths, offsets, colors from theme
          // tokens) that cannot be pre-hashed and have no nonce hook. This
          // directive governs ATTRIBUTES ONLY — <style> elements remain locked
          // down via style-src / style-src-elem above (nonce + specific
          // hashes, no unsafe-inline). securityheaders.com does not penalize
          // style-src-attr 'unsafe-inline'; A+ rating is preserved. To remove
          // this in the future, every `style={{}}` in JSX and each of those
          // libraries would need to be replaced with class-based styling.
          "style-src-attr 'unsafe-inline'",
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
