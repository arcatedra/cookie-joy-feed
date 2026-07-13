import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHash } from "crypto";

const emailSchema = z.object({
  email: z.string().email().max(255),
  captchaToken: z.string().max(4096).optional(),
});

const finalizeSchema = z.object({
  email: z.string().email().max(255),
  success: z.boolean(),
});

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function clientIp(): string {
  try {
    const cf = getRequestHeader("cf-connecting-ip");
    if (cf) return cf;
    const xff = getRequestHeader("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    return getRequestIP({ xForwardedFor: true }) ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/**
 * Public config: returns the Turnstile site key so the client can render the widget.
 */
export const getLoginSecurityConfig = createServerFn({ method: "GET" }).handler(async () => {
  return { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "" };
});

/**
 * Pre-flight check before signInWithPassword.
 * Returns: { ok, requireCaptcha, blocked, retryAfterSec, failCount }
 *  - blocked: too many recent fails → refuse to attempt.
 *  - requireCaptcha: 2+ fails in window → captcha token required (and verified here if present).
 */
export const preflightLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = clientIp();
    const emailHash = hashEmail(data.email);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rl, error } = await supabaseAdmin.rpc("check_login_rate_limit", {
      _email_hash: emailHash,
      _ip: ip,
    });
    if (error) {
      // Fail open on rate-limit read errors, but never on captcha.
      return { ok: true, requireCaptcha: false, blocked: false, retryAfterSec: 0, failCount: 0 };
    }
    const row = Array.isArray(rl) ? rl[0] : rl;
    const failCount: number = row?.fail_count ?? 0;
    const blocked: boolean = row?.blocked ?? false;
    const retryAfterSec: number = row?.retry_after_sec ?? 0;

    if (blocked) {
      return { ok: false, blocked: true, requireCaptcha: false, retryAfterSec, failCount };
    }

    const requireCaptcha = failCount >= 2;
    if (requireCaptcha) {
      if (!data.captchaToken) {
        return { ok: false, blocked: false, requireCaptcha: true, retryAfterSec: 0, failCount };
      }
      const valid = await verifyTurnstile(data.captchaToken, ip);
      if (!valid) {
        return { ok: false, blocked: false, requireCaptcha: true, retryAfterSec: 0, failCount };
      }
    }

    return { ok: true, blocked: false, requireCaptcha, retryAfterSec: 0, failCount };
  });

/**
 * Record the outcome of a sign-in attempt. Called after signInWithPassword resolves.
 */
export const finalizeLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => finalizeSchema.parse(input))
  .handler(async ({ data }) => {
    const ip = clientIp();
    const emailHash = hashEmail(data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("record_login_attempt", {
      _email_hash: emailHash,
      _ip: ip,
      _success: data.success,
    });
    return { ok: true };
  });
