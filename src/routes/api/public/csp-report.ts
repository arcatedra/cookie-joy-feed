import { createFileRoute } from "@tanstack/react-router";

/**
 * CSP violation report receiver.
 *
 * Accepts both legacy `application/csp-report` payloads
 * (`{ "csp-report": { ... } }`) and modern Reporting API batches
 * (`application/reports+json`, an array of `{ type, body }` objects).
 *
 * Reports are logged to the worker console — inspect them with
 * `server-function-logs` filtered by "CSP_VIOLATION".
 *
 * NOTE: This endpoint lives under /api/public/* so browsers can POST reports
 * without an auth token. It is write-only from the browser's perspective:
 * we never return report data to any caller.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, application/csp-report, application/reports+json",
  "Access-Control-Max-Age": "86400",
} as const;

type LegacyReport = {
  "csp-report"?: Record<string, unknown>;
};

type ModernReport = {
  type?: string;
  body?: Record<string, unknown>;
};

function summarize(body: Record<string, unknown>) {
  // Pull the fields we care about; keep the payload small and PII-free.
  const pick = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);
  return {
    directive:
      pick("effectiveDirective") ||
      pick("effective-directive") ||
      pick("violatedDirective") ||
      pick("violated-directive"),
    blocked: pick("blockedURL") || pick("blocked-uri") || pick("blockedURI"),
    source: pick("sourceFile") || pick("source-file"),
    line: body["lineNumber"] ?? body["line-number"],
    column: body["columnNumber"] ?? body["column-number"],
    sample: pick("sample") || pick("scriptSample"),
    documentURL: pick("documentURL") || pick("document-uri"),
    disposition: pick("disposition"),
  };
}

export const Route = createFileRoute("/api/public/csp-report")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") ?? "";
          const raw = await request.text();
          if (!raw) {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
          }

          // Cap payload to avoid log-flood abuse (browsers send small blobs).
          if (raw.length > 16_000) {
            console.warn("CSP_VIOLATION oversized payload dropped", {
              bytes: raw.length,
            });
            return new Response(null, { status: 204, headers: CORS_HEADERS });
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
          }

          const userAgent = request.headers.get("user-agent") ?? "";

          if (Array.isArray(parsed)) {
            // Modern Reporting API batch.
            for (const entry of parsed as ModernReport[]) {
              if (entry?.type !== "csp-violation" || !entry.body) continue;
              console.warn("CSP_VIOLATION", {
                ...summarize(entry.body),
                userAgent,
              });
            }
          } else if (parsed && typeof parsed === "object") {
            const body = (parsed as LegacyReport)["csp-report"];
            if (body && typeof body === "object") {
              console.warn("CSP_VIOLATION", {
                ...summarize(body as Record<string, unknown>),
                userAgent,
              });
            }
          }

          return new Response(null, { status: 204, headers: CORS_HEADERS });
        } catch (err) {
          // Never surface receiver errors to the browser — that would create
          // a feedback loop of failed reports.
          console.error("CSP_VIOLATION handler error", err);
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
      },
    },
  },
});
