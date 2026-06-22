import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("winner_claims")
      .select("*")
      .eq("draw_date", data.drawDate)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[winner-claim] get error", error);
      return null;
    }
    return row;
  });

const submitSchema = z.object({
  drawDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fullName: z.string().trim().min(2).max(120),
  address1: z.string().trim().min(2).max(200),
  address2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/),
  zip: z.string().trim().min(3).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().trim().min(6).max(40),
  paymentMethod: z.enum(["paypal", "zelle", "check"]),
  paymentDestination: z.string().trim().min(2).max(255),
  idDocumentPath: z.string().trim().min(3).max(500),
  w9DocumentPath: z.string().trim().min(3).max(500),
  acceptTax: z.literal(true),
});

export const submitClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing, error: readErr } = await context.supabase
      .from("winner_claims")
      .select("status, claim_deadline")
      .eq("draw_date", data.drawDate)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr || !existing) return { ok: false as const, error: "Reclamo no encontrado." };
    if (existing.status !== "pending_verification")
      return { ok: false as const, error: "Este reclamo ya no se puede modificar." };
    if (new Date(existing.claim_deadline as string).getTime() < Date.now())
      return { ok: false as const, error: "El periodo de reclamo ha expirado." };

    const { error } = await context.supabase
      .from("winner_claims")
      .update({
        full_name: data.fullName,
        address1: data.address1,
        address2: data.address2 || null,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        dob: data.dob,
        phone: data.phone,
        payment_method: data.paymentMethod,
        payment_destination: data.paymentDestination,
        id_document_path: data.idDocumentPath,
        w9_document_path: data.w9DocumentPath,
        submitted_at: new Date().toISOString(),
      })
      .eq("draw_date", data.drawDate)
      .eq("user_id", context.userId);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
