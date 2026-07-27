import { setCookie } from "@tanstack/react-start/server";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export function setReferralCookie(ref: string) {
  setCookie(REF_COOKIE, ref, {
    maxAge: NINETY_DAYS,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
}
