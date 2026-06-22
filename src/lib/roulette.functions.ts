import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { MISSIONS, PRIZES, SPIN_COST, type MissionKey } from "./roulette-config";

const GUEST_COOKIE = "origen_guest";
const GUEST_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return s;
}

function signEmail(email: string): string {
  const norm = email.trim().toLowerCase();
  const sig = createHmac("sha256", getSecret()).update(norm).digest("hex").slice(0, 32);
  return `${norm}|${sig}`;
}

function verifyGuestCookie(): string | null {
  const raw = getCookie(GUEST_COOKIE);
  if (!raw) return null;
  const [email, sig] = raw.split("|");
  if (!email || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(email).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return email;
}

async function getSubject(): Promise<
  { kind: "user"; userId: string } | { kind: "guest"; email: string } | null
> {
  // Try bearer (logged-in)
  try {
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      if (token) {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data } = await sb.auth.getClaims(token);
        if (data?.claims?.sub) return { kind: "user", userId: data.claims.sub as string };
      }
    }
  } catch {
    /* ignore */
  }
  const email = verifyGuestCookie();
  if (email) return { kind: "guest", email };
  return null;
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureTokenRow(
  subject: { kind: "user"; userId: string } | { kind: "guest"; email: string },
) {
  const sb = await getAdmin();
  const filter =
    subject.kind === "user"
      ? sb.from("user_tokens").select("*").eq("user_id", subject.userId).maybeSingle()
      : sb.from("user_tokens").select("*").ilike("guest_email", subject.email).maybeSingle();
  const { data } = await filter;
  if (data) return data;
  const insert = {
    user_id: subject.kind === "user" ? subject.userId : null,
    guest_email: subject.kind === "guest" ? subject.email : null,
    balance: 0,
  };
  const { data: created, error } = await sb
    .from("user_tokens")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw error;
  return created;

}

async function addTokens(
  subject: { kind: "user"; userId: string } | { kind: "guest"; email: string },
  amount: number,
) {
  const sb = await getAdmin();
  const row = await ensureTokenRow(subject);
  const { error } = await sb
    .from("user_tokens")
    .update({ balance: row.balance + amount })
    .eq("id", row.id);
  if (error) throw error;
  return row.balance + amount;
}

async function spendTokens(
  subject: { kind: "user"; userId: string } | { kind: "guest"; email: string },
  amount: number,
) {
  const sb = await getAdmin();
  const row = await ensureTokenRow(subject);
  if (row.balance < amount) throw new Error("INSUFFICIENT_TOKENS");
  const { data, error } = await sb
    .from("user_tokens")
    .update({ balance: row.balance - amount })
    .eq("id", row.id)
    .eq("balance", row.balance)
    .select("balance")
    .single();
  if (error || !data) throw new Error("INSUFFICIENT_TOKENS");
  return data.balance;
}

// ─── PUBLIC SERVER FNS ──────────────────────────────────────

export const getRouletteState = createServerFn({ method: "GET" }).handler(async () => {
  const subject = await getSubject();
  if (!subject) {
    return {
      authenticated: false as const,
      balance: 0,
      missionsClaimed: [] as MissionKey[],
      missionsStarted: {} as Record<MissionKey, number>,
      hasAmoe: false,
      recentSpins: [] as Array<{ prize_label: string; created_at: string; coupon_code: string | null }>,
    };
  }
  const sb = await getAdmin();
  const row = await ensureTokenRow(subject);

  const claimsQ =
    subject.kind === "user"
      ? sb.from("mission_claims").select("mission_key").eq("user_id", subject.userId)
      : sb.from("mission_claims").select("mission_key").ilike("guest_email", subject.email);
  const startsQ =
    subject.kind === "user"
      ? sb.from("mission_starts").select("mission_key, started_at").eq("user_id", subject.userId)
      : sb.from("mission_starts").select("mission_key, started_at").ilike("guest_email", subject.email);
  const spinsQ =
    subject.kind === "user"
      ? sb
          .from("spin_history")
          .select("prize_label, created_at, coupon_code")
          .eq("user_id", subject.userId)
          .order("created_at", { ascending: false })
          .limit(5)
      : sb
          .from("spin_history")
          .select("prize_label, created_at, coupon_code")
          .ilike("guest_email", subject.email)
          .order("created_at", { ascending: false })
          .limit(5);

  const amoeQ =
    subject.kind === "guest"
      ? sb.from("amoe_entries").select("id").ilike("email", subject.email).maybeSingle()
      : sb.from("amoe_entries").select("id").eq("user_id", subject.userId).maybeSingle();

  const [claims, starts, spins, amoe] = await Promise.all([claimsQ, startsQ, spinsQ, amoeQ]);

  const startsMap: Record<string, number> = {};
  for (const s of starts.data ?? []) {
    const ts = new Date(s.started_at).getTime();
    if (!startsMap[s.mission_key] || startsMap[s.mission_key] < ts) startsMap[s.mission_key] = ts;
  }

  return {
    authenticated: true as const,
    kind: subject.kind,
    balance: row.balance,
    missionsClaimed: (claims.data ?? []).map((c) => c.mission_key as MissionKey),
    missionsStarted: startsMap as Record<MissionKey, number>,
    hasAmoe: !!amoe.data,
    recentSpins: spins.data ?? [],
  };
});

const amoeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40),
  essay: z.string().trim().min(1).max(20000),
});

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export const submitAmoeEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => amoeSchema.parse(d))
  .handler(async ({ data }) => {
    if (wordCount(data.essay) < 300) {
      return { ok: false as const, error: "El ensayo debe tener al menos 300 palabras." };
    }
    const sb = await getAdmin();
    const email = data.email.trim().toLowerCase();

    const { data: existing } = await sb
      .from("amoe_entries")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "Este correo ya participó en el sorteo gratuito." };
    }

    const req = getRequest();
    const ip =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    const { error } = await sb.from("amoe_entries").insert({
      email,
      full_name: data.fullName,
      phone: data.phone,
      essay: data.essay,
      ip,
    });
    if (error) return { ok: false as const, error: error.message };

    // Otorgar 1 token base al invitado.
    setCookie(GUEST_COOKIE, signEmail(email), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: GUEST_TTL_SECONDS,
      path: "/",
    });
    await addTokens({ kind: "guest", email }, 1);

    return { ok: true as const };
  });

export const startMission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mission: z.enum(["tiktok", "instagram", "facebook"]) }).parse(d))
  .handler(async ({ data }) => {
    const subject = await getSubject();
    if (!subject) return { ok: false as const, error: "No autorizado" };
    const sb = await getAdmin();
    const insert = {
      user_id: subject.kind === "user" ? subject.userId : null,
      guest_email: subject.kind === "guest" ? subject.email : null,
      mission_key: data.mission,
    };
    const { error } = await sb.from("mission_starts").insert(insert);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, startedAt: Date.now() };
  });

export const claimMission = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mission: z.enum(["tiktok", "instagram", "facebook"]) }).parse(d))
  .handler(async ({ data }) => {
    const subject = await getSubject();
    if (!subject) return { ok: false as const, error: "No autorizado" };
    const sb = await getAdmin();

    // Already claimed?
    const existingQ =
      subject.kind === "user"
        ? sb
            .from("mission_claims")
            .select("id")
            .eq("user_id", subject.userId)
            .eq("mission_key", data.mission)
            .maybeSingle()
        : sb
            .from("mission_claims")
            .select("id")
            .ilike("guest_email", subject.email)
            .eq("mission_key", data.mission)
            .maybeSingle();
    const { data: existing } = await existingQ;
    if (existing) return { ok: false as const, error: "Misión ya reclamada." };

    // Verify started_at
    const startQ =
      subject.kind === "user"
        ? sb
            .from("mission_starts")
            .select("started_at")
            .eq("user_id", subject.userId)
            .eq("mission_key", data.mission)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : sb
            .from("mission_starts")
            .select("started_at")
            .ilike("guest_email", subject.email)
            .eq("mission_key", data.mission)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
    const { data: start } = await startQ;
    if (!start) return { ok: false as const, error: "Primero abre el video." };
    const elapsed = (Date.now() - new Date(start.started_at).getTime()) / 1000;
    const required = MISSIONS[data.mission].seconds;
    if (elapsed < required) {
      return { ok: false as const, error: `Espera ${Math.ceil(required - elapsed)}s más.` };
    }

    const reward = MISSIONS[data.mission].reward;
    const insert =
      subject.kind === "user"
        ? { user_id: subject.userId, mission_key: data.mission, tokens_awarded: reward }
        : { guest_email: subject.email, mission_key: data.mission, tokens_awarded: reward };
    const { error } = await sb.from("mission_claims").insert(insert);
    if (error) return { ok: false as const, error: error.message };

    const newBalance = await addTokens(subject, reward);
    return { ok: true as const, reward, balance: newBalance };
  });

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return { index: i, prize: PRIZES[i] };
  }
  return { index: PRIZES.length - 1, prize: PRIZES[PRIZES.length - 1] };
}

function makeCouponCode() {
  return "ORG-" + randomBytes(5).toString("hex").toUpperCase();
}

export const spin = createServerFn({ method: "POST" }).handler(async () => {
  const subject = await getSubject();
  if (!subject) return { ok: false as const, error: "No autorizado" };
  try {
    await spendTokens(subject, SPIN_COST);
  } catch {
    return { ok: false as const, error: "Saldo insuficiente." };
  }
  const sb = await getAdmin();
  const { index, prize } = pickPrize();
  let couponCode: string | null = null;
  if (prize.hasCoupon) {
    couponCode = makeCouponCode();
    await sb.from("spin_coupons").insert({
      code: couponCode,
      prize_key: prize.key,
      subject_user_id: subject.kind === "user" ? subject.userId : null,
      subject_email: subject.kind === "guest" ? subject.email : null,
    });
  }
  const insert =
    subject.kind === "user"
      ? {
          user_id: subject.userId,
          prize_key: prize.key,
          prize_label: prize.label,
          coupon_code: couponCode,
          tokens_spent: SPIN_COST,
        }
      : {
          guest_email: subject.email,
          prize_key: prize.key,
          prize_label: prize.label,
          coupon_code: couponCode,
          tokens_spent: SPIN_COST,
        };
  await sb.from("spin_history").insert(insert);
  return {
    ok: true as const,
    prizeIndex: index,
    prizeKey: prize.key,
    prizeLabel: prize.label,
    couponCode,
  };
});
