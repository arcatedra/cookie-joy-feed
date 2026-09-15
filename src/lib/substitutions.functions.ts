import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type PendingSubstitution = {
  itemId: string;
  name: string;
  qty: number;
  notifiedAt: string | null;
  mode: string;
};

/** Artículos del pedido marcados sin stock que esperan respuesta del cliente. */
export const getMyPendingSubstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }): Promise<PendingSubstitution[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_my_pending_substitutions", {
      p_order_id: data.orderId,
    });
    if (error) {
      console.error("[substitutions] pending error", error);
      return [];
    }
    return ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      itemId: String(r["item_id"]),
      name: String(r["nombre_producto"] ?? ""),
      qty: Number(r["cantidad"] ?? 1),
      notifiedAt: (r["notified_at"] as string | null) ?? null,
      mode: String(r["substitution_mode"] ?? "best_match"),
    }));
  });

/** El cliente responde: aceptar la mejor opción similar o pedir devolución. */
export const respondSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string; response: "accept" | "refund" }) => ({
    itemId: uuid.parse(d.itemId),
    response: z.enum(["accept", "refund"]).parse(d.response),
  }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("respond_substitution", {
      p_item_id: data.itemId,
      p_response: data.response,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Almacén: marcar un artículo como sin stock y avisar al cliente.
// ---------------------------------------------------------------------------

const PUSH_TEXT: Record<string, { title: string; body: string; accept: string; refund: string; options: string }> = {
  es: {
    title: "Un artículo está agotado",
    body: "{{name}} no está disponible. Elige qué hacer; tienes 10 minutos.",
    accept: "Sí, llévalo",
    refund: "Devuélveme el dinero",
    options: "Ver otras opciones",
  },
  en: {
    title: "An item is out of stock",
    body: "{{name}} is unavailable. Choose what to do; you have 10 minutes.",
    accept: "Yes, take it",
    refund: "Refund me",
    options: "See other options",
  },
};

export const markItemOutOfStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string }) => ({ itemId: uuid.parse(d.itemId) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await supabaseAdmin
      .from("pedido_items")
      .update({ status: "sin_stock", notified_at: new Date().toISOString() })
      .eq("id", data.itemId)
      .select("id, pedido_id, nombre_producto, substitution_mode")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("Artículo no encontrado");

    const row = item as Record<string, unknown>;
    // Solo avisamos si el cliente no dejó preferencia (mejor opción por defecto).
    if (row["substitution_mode"] !== "best_match") return { ok: true as const, notified: false };

    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("cliente_id")
      .eq("id", row["pedido_id"] as string)
      .maybeSingle();
    const customerId = (pedido as { cliente_id?: string } | null)?.cliente_id;
    if (customerId) {
      await notifyOutOfStock(
        customerId,
        row["pedido_id"] as string,
        row["id"] as string,
        String(row["nombre_producto"] ?? ""),
      );
    }
    return { ok: true as const, notified: Boolean(customerId) };
  });

async function notifyOutOfStock(
  customerId: string,
  orderId: string,
  itemId: string,
  name: string,
) {
  try {
    const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
    if (!vapidPublic || !vapidPrivate) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("locale")
      .eq("id", customerId)
      .maybeSingle();
    const raw = (profile as { locale?: string | null } | null)?.locale ?? "es";
    const text = PUSH_TEXT[raw] ?? PUSH_TEXT["en"]!;

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", customerId);
    if (!subs || subs.length === 0) return;

    const base = `https://www.hazorex.com/pedido/${orderId}/seguimiento`;
    const actions = JSON.stringify([
      { action: "accept", title: text.accept, url: `${base}?subs=${itemId}&resp=accept` },
      { action: "refund", title: text.refund, url: `${base}?subs=${itemId}&resp=refund` },
      { action: "options", title: text.options, url: base },
    ]);

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = {
      subject: process.env["VAPID_SUBJECT"] ?? "mailto:noreply@origen.management",
      publicKey: vapidPublic,
      privateKey: vapidPrivate,
    };

    await Promise.all(
      (subs as Array<Record<string, string>>).map(async (s) => {
        try {
          const payload = await buildPushPayload(
            {
              data: {
                title: text.title,
                body: text.body.replace("{{name}}", name),
                url: base,
                tag: `subs-${itemId}`,
                actions,
              },
              options: { ttl: 600, urgency: "high" as const, topic: "subs" },
            },
            {
              endpoint: s["endpoint"] as string,
              expirationTime: null,
              keys: { p256dh: s["p256dh"] as string, auth: s["auth"] as string },
            },
            vapid,
          );
          const resp = await fetch(s["endpoint"] as string, {
            method: payload.method,
            headers: payload.headers,
            body: payload.body.buffer.slice(
              payload.body.byteOffset,
              payload.body.byteOffset + payload.body.byteLength,
            ) as ArrayBuffer,
          });
          if (resp.status === 404 || resp.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", s["id"] as string);
          }
        } catch (err) {
          console.warn("[substitutions] push error", err);
        }
      }),
    );
  } catch (err) {
    console.error("notifyOutOfStock error", err);
  }
}
