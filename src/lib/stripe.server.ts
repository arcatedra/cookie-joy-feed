// Server-only Stripe gateway helper. The `.server.ts` extension prevents
// this file from being bundled into the client.
import process from "node:process";

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/stripe";

export type StripeEnv = "sandbox" | "live";

// DEV_FORCE_SANDBOX: while the project is still in testing we hard-force
// Stripe sandbox on every host (preview AND the published domain) so no
// real charge can ever be initiated. To go live for real payments, restore
// the previous host-based logic:
//   const n = (host ?? "").toLowerCase();
//   if (!n || n.includes("localhost") || n.includes("preview")) return "sandbox";
//   return "live";
export function paymentsEnvironmentForHost(_host?: string | null): StripeEnv {
  return "sandbox";
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

/**
 * Captura (cobra) un monto ya autorizado.
 *
 * `idempotencyKey` es obligatoria: si la red falla y se reintenta, Stripe
 * devuelve el mismo resultado en vez de cobrar dos veces.
 */
export async function stripeCapturePaymentIntent<T = unknown>(
  paymentIntentId: string,
  amountToCaptureCents: number,
  idempotencyKey: string,
  env: StripeEnv = "sandbox",
): Promise<T> {
  return stripePost<T>(
    `/v1/payment_intents/${paymentIntentId}/capture`,
    { amount_to_capture: amountToCaptureCents },
    env,
    { "Idempotency-Key": idempotencyKey },
  );
}

/** Libera por completo una autorización sin cobrar nada. */
export async function stripeCancelPaymentIntent<T = unknown>(
  paymentIntentId: string,
  idempotencyKey: string,
  env: StripeEnv = "sandbox",
): Promise<T> {
  return stripePost<T>(
    `/v1/payment_intents/${paymentIntentId}/cancel`,
    { cancellation_reason: "abandoned" },
    env,
    { "Idempotency-Key": idempotencyKey },
  );
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

// ---------------------------------------------------------------------------
// Stripe Accounts v2 (cuentas de cobro de tiendas y repartidores).
// La cuenta real no permite "Accounts v1 support", así que las cuentas
// conectadas se crean con /v2/core/accounts (configuración "recipient").
// Las transferencias siguen usando /v1/transfers con source_transaction.
// ---------------------------------------------------------------------------
const STRIPE_V2_VERSION = "2026-03-25.preview";

async function stripeV2<T = unknown>(
  method: "GET" | "POST",
  path: string,
  env: StripeEnv,
  body?: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    method,
    headers: {
      ...gatewayHeaders(env),
      "Stripe-Version": STRIPE_V2_VERSION,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe gateway ${path} failed: ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

/** Crea una cuenta conectada v2 que solo recibe transferencias (Express). */
export async function createRecipientAccount(
  input: { email: string; displayName: string; entityType: "individual" | "company"; metadata: Record<string, string> },
  env: StripeEnv,
  idempotencyKey: string,
): Promise<string> {
  const acct = await stripeV2<any>(
    "POST",
    "/v2/core/accounts",
    env,
    {
      contact_email: input.email,
      display_name: input.displayName,
      dashboard: "express",
      identity: { country: "us", entity_type: input.entityType },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      defaults: {
        currency: "usd",
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      metadata: input.metadata,
    },
    { "Idempotency-Key": idempotencyKey },
  );
  if (!acct?.id) throw new Error("No se pudo crear la cuenta de cobro.");
  return acct.id as string;
}

/** Enlace de registro (onboarding) de una cuenta v2. */
export async function createRecipientOnboardingLink(
  accountId: string,
  backTo: string,
  env: StripeEnv,
): Promise<string> {
  const link = await stripeV2<any>("POST", "/v2/core/account_links", env, {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: { configurations: ["recipient"], refresh_url: backTo, return_url: backTo },
    },
  });
  if (!link?.url) throw new Error("No se pudo generar el enlace de registro.");
  return link.url as string;
}

/** Estado de una cuenta v2: puede recibir transferencias y depositar al banco. */
export async function getRecipientStatus(
  accountId: string,
  env: StripeEnv,
): Promise<{ transfersActive: boolean; payoutsActive: boolean }> {
  const acct = await stripeV2<any>(
    "GET",
    `/v2/core/accounts/${accountId}?include=configuration.recipient&include=requirements`,
    env,
  );
  const bal = acct?.configuration?.recipient?.capabilities?.stripe_balance ?? {};
  return {
    transfersActive: bal?.stripe_transfers?.status === "active",
    payoutsActive: bal?.payouts?.status === "active",
  };
}
