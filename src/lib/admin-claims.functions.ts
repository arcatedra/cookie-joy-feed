import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("FORBIDDEN");
}

export const listWinnerClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z
          .enum([
            "all",
            "pending_verification",
            "submitted",
            "verified",
            "paid",
            "rejected",
            "expired",
          ])
          .default("all"),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("winner_claims")
      .select(
        "id, draw_date, email, display_name, prize_usd, status, submitted_at, notified_at, claim_deadline, paid_at, verified_at, rejected_at, payment_method, payment_reference",
        { count: "exact" },
      )
      .order("draw_date", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const getWinnerClaimDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("winner_claims")
      .select("*")
      .eq("draw_date", data.drawDate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = async (path: string | null) => {
      if (!path) return null;
      const { data: s } = await supabaseAdmin.storage
        .from("winner-documents")
        .createSignedUrl(path, 600);
      return s?.signedUrl ?? null;
    };
    const idUrl = await signed(row.id_document_path as string | null);
    const w9Url = await signed(row.w9_document_path as string | null);
    return { ...row, id_document_url: idUrl, w9_document_url: w9Url };
  });

export const approveWinnerClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error: readErr } = await context.supabase
      .from("winner_claims")
      .select("status")
      .eq("draw_date", data.drawDate)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) return { ok: false as const, error: "Reclamo no encontrado." };
    if (row.status !== "submitted" && row.status !== "pending_verification") {
      return { ok: false as const, error: `No se puede aprobar (estado: ${row.status}).` };
    }
    const { error } = await context.supabase
      .from("winner_claims")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: context.userId,
        admin_notes: data.notes ?? null,
      })
      .eq("draw_date", data.drawDate);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const rejectWinnerClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().min(3).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error: readErr } = await context.supabase
      .from("winner_claims")
      .select("status")
      .eq("draw_date", data.drawDate)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) return { ok: false as const, error: "Reclamo no encontrado." };
    if (row.status === "paid") {
      return { ok: false as const, error: "No se puede rechazar un pago ya hecho." };
    }
    const { error } = await context.supabase
      .from("winner_claims")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejected_by: context.userId,
        rejection_reason: data.reason,
      })
      .eq("draw_date", data.drawDate);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const markWinnerClaimPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        paymentReference: z.string().trim().min(2).max(255),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error: readErr } = await context.supabase
      .from("winner_claims")
      .select("status")
      .eq("draw_date", data.drawDate)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) return { ok: false as const, error: "Reclamo no encontrado." };
    if (row.status !== "verified") {
      return {
        ok: false as const,
        error: `Solo reclamos verificados pueden marcarse como pagados (estado: ${row.status}).`,
      };
    }
    const { error } = await context.supabase
      .from("winner_claims")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: context.userId,
        payment_reference: data.paymentReference,
      })
      .eq("draw_date", data.drawDate);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
