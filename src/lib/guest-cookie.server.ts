import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "crypto";

export const GUEST_COOKIE = "origen_guest";
export const GUEST_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return s;
}

function sign(email: string): string {
  return createHmac("sha256", getSecret()).update(email).digest("hex").slice(0, 32);
}

/** Build a `email|sig` cookie payload for the given email. */
export function signGuestEmail(email: string): string {
  const norm = email.trim().toLowerCase();
  return `${norm}|${sign(norm)}`;
}

/**
 * Read the guest cookie and return the email ONLY if its HMAC signature
 * matches. Returns null for missing, malformed, or tampered cookies.
 */
export function verifyGuestCookie(): string | null {
  const raw = getCookie(GUEST_COOKIE);
  if (!raw) return null;
  const [email, sig] = raw.split("|");
  if (!email || !sig) return null;
  const expected = sign(email);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}

/** Set a signed guest cookie. */
export function setGuestCookie(email: string) {
  setCookie(GUEST_COOKIE, signGuestEmail(email), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: GUEST_TTL_SECONDS,
    path: "/",
  });
}
