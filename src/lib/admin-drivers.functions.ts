import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("FORBIDDEN");
}

export const listDriversForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pendiente" | "aprobado" | "rechazado" | "all" }) => ({
    status: d.status ?? "pendiente",
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("drivers")
      .select("id, full_name, email, phone, city, application_status, is_active, is_online, rating, created_at, approved_at, rejected_at, rejection_reason")
      .order("created_at", { ascending: false });
    if (data.status !== "all") query = query.eq("application_status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDriverForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { driverId: string }) => ({ driverId: uuid.parse(d.driverId) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: driver, error } = await context.supabase
      .from("drivers")
      .select("*")
      .eq("id", data.driverId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!driver) throw new Error("Repartidor no encontrado");

    const [{ data: docs }, { data: vehicles }] = await Promise.all([
      context.supabase.from("driver_documents").select("*").eq("driver_id", data.driverId).order("uploaded_at", { ascending: false }),
      context.supabase.from("driver_vehicles").select("*").eq("driver_id", data.driverId),
    ]);

    return { driver, documents: docs ?? [], vehicles: vehicles ?? [] };
  });

export const approveDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { driverId: string }) => ({ driverId: uuid.parse(d.driverId) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("drivers")
      .update({
        application_status: "aprobado",
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: context.userId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      })
      .eq("id", data.driverId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { driverId: string; reason: string }) => ({
    driverId: uuid.parse(d.driverId),
    reason: z.string().trim().min(3).max(500).parse(d.reason),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("drivers")
      .update({
        application_status: "rechazado",
        is_active: false,
        rejected_at: new Date().toISOString(),
        rejected_by: context.userId,
        rejection_reason: data.reason,
      })
      .eq("id", data.driverId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { documentId: string; action: "aprobar" | "rechazar"; reason?: string }) => ({
    documentId: uuid.parse(d.documentId),
    action: z.enum(["aprobar", "rechazar"]).parse(d.action),
    reason: z.string().trim().max(500).optional().parse(d.reason),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const now = new Date().toISOString();
    if (data.action === "aprobar") {
      const { error } = await context.supabase
        .from("driver_documents")
        .update({ status: "aprobado", reviewed_by: context.userId, reviewed_at: now, rejection_reason: null })
        .eq("id", data.documentId);
      if (error) throw new Error(error.message);
    } else {
      if (!data.reason) throw new Error("Debes indicar el motivo del rechazo");
      const { error } = await context.supabase
        .from("driver_documents")
        .update({ status: "rechazado", reviewed_by: context.userId, reviewed_at: now, rejection_reason: data.reason })
        .eq("id", data.documentId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listLiveActiveOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("courier_orders")
      .select(`
        id, status, pickup_address, pickup_lat, pickup_lng,
        driver_id, accepted_at,
        drivers:driver_id ( full_name, phone, last_lat, last_lng, last_seen_at, is_online )
      `)
      .in("status", ["aceptado", "en_recoleccion", "en_camino_entrega"])
      .order("accepted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
