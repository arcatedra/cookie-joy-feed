import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitInput = z.object({
  bookingId: z.string().uuid(),
  photoPath: z.string().min(1).max(500),
  description: z.string().min(1).max(1000),
});

export const submitDeliveryProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: booking, error: bErr } = await supabase
      .from("delivery_bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw bErr;
    if (!booking) throw new Error("Entrega no encontrada");
    if (booking.status === "canceled") throw new Error("La entrega está cancelada");

    const { error: uErr } = await supabase
      .from("delivery_bookings")
      .update({
        status: "delivered",
        proof_photo_path: data.photoPath,
        proof_description: data.description,
        delivered_at: new Date().toISOString(),
        delivered_by: userId,
      })
      .eq("id", data.bookingId);
    if (uErr) throw uErr;

    return { ok: true };
  });

const signInput = z.object({ path: z.string().min(1).max(500) });

export const getDeliveryProofSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => signInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorization: admin OR the path's first folder is the caller's uid
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const firstFolder = data.path.split("/")[0];
    if (!isAdmin && firstFolder !== userId) throw new Error("Forbidden");

    const { data: signed, error } = await supabase.storage
      .from("delivery-proofs")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw error ?? new Error("No se pudo firmar la URL");
    return { url: signed.signedUrl };
  });

export const adminListDeliveryBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await supabase
      .from("delivery_bookings")
      .select(
        "id, user_id, scheduled_date, address, notes, status, proof_photo_path, proof_description, delivered_at",
      )
      .order("scheduled_date", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { bookings: data ?? [] };
  });
