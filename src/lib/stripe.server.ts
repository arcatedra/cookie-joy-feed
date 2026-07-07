// Server-only Stripe gateway helper. The `.server.ts` extension prevents
// this file from being bundled into the client.
import process from "node:process";

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/stripe";

export type StripeEnv = "sandbox" | "live";

export function paymentsEnvironmentForHost(host?: string | null): StripeEnv {
  const normalized = (host ?? "").toLowerCase();
  if (!normalized || normalized.includes("localhost") || normalized.includes("preview")) {
    return "sandbox";
  }
  return "live";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function gatewayHeaders(env: StripeEnv = "sandbox") {
  const connectionKey = env === "live" ? "STRIPE_LIVE_API_KEY" : "STRIPE_SANDBOX_API_KEY";
  return {
    Authorization: `Bearer ${requireEnv("LOVABLE_API_KEY")}`,
    "Lovable-API-Key": requireEnv("LOVABLE_API_KEY"),
    "X-Connection-Api-Key": requireEnv(connectionKey),
  };
}

/** Convert nested objects/arrays into Stripe's form-encoded bracket syntax. */
function encodeForm(
  obj: Record<string, unknown>,
  prefix = "",
  out: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          encodeForm(item as Record<string, unknown>, `${k}[${i}]`, out);
        } else {
          out.append(`${k}[${i}]`, String(item));
        }
      });
    } else if (typeof val === "object") {
      encodeForm(val as Record<string, unknown>, k, out);
    } else {
      out.append(k, String(val));
    }
  }
  return out;
}

export async function stripePost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  env: StripeEnv = "sandbox",
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    method: "POST",
    headers: {
      ...gatewayHeaders(env),
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders,
    },
    body: encodeForm(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe gateway ${path} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

export async function stripeGet<T = unknown>(
  path: string,
  env: StripeEnv = "sandbox",
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    method: "GET",
    headers: { ...gatewayHeaders(env), ...extraHeaders },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe gateway ${path} failed: ${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}
