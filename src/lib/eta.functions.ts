import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type StopEta = {
  eta: string | null;
  sequenceNumber: number;
  totalStops: number;
  status: string;
} | null;

/**
 * Hora estimada de llegada del pedido del cliente autenticado.
 * Usa la función segura get_my_stop_eta: solo devuelve datos del propio pedido.
 */
export const getMyStopEta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }): Promise<StopEta> => {
    const { data: rows, error } = await context.supabase.rpc("get_my_stop_eta" as never, {
      p_order_id: data.orderId,
    } as never);
    if (error) return null;

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;

    const r = row as {
      eta: string | null;
      sequence_number: number;
      total_stops: number;
      status: string;
    };

    return {
      eta: r.eta,
      sequenceNumber: r.sequence_number,
      totalStops: r.total_stops,
      status: r.status,
    };
  });

/** Formatea una hora en zona horaria de Nueva York: "6:35 PM". */
function formatEtaNY(iso: string): string {
  return new Intl.DateTimeFormat("es-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

export type DelayResult = {
  stops: number;
  notified: number;
  nextEta: string | null;
};

/**
 * "Voy retrasado": suma minutos a la ETA de todas las paradas pendientes
 * de la ruta activa del repartidor y avisa por push a esos clientes.
 */
export const reportRouteDelay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { minutes: number }) => ({
    minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).parse(d.minutes),
  }))
  .handler(async ({ context, data }): Promise<DelayResult> => {
    const { data: rows, error } = await context.supabase.rpc("delay_route_stops" as never, {
      p_minutes: data.minutes,
    } as never);
    if (error) throw new Error(error.message);

    const stops = (Array.isArray(rows) ? rows : []) as Array<{
      order_id: string;
      cliente_id: string | null;
      new_eta: string | null;
    }>;

    const withEta = stops.filter((s) => s.cliente_id && s.new_eta);
    const nextEta =
      withEta
        .map((s) => s.new_eta as string)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

    let notified = 0;
    try {
      const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
      const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
      if (withEta.length > 0 && vapidPublic && vapidPrivate) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const userIds = [...new Set(withEta.map((s) => s.cliente_id as string))];
        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth, user_id")
          .in("user_id", userIds);

        if (subs && subs.length > 0) {
          const etaByUser = new Map<string, string>();
          for (const s of withEta) etaByUser.set(s.cliente_id as string, s.new_eta as string);

          const { buildPushPayload } = await import("@block65/webcrypto-web-push");
          const vapid = {
            subject: process.env["VAPID_SUBJECT"] ?? "mailto:noreply@origen.management",
            publicKey: vapidPublic,
            privateKey: vapidPrivate,
          };

          await Promise.all(
            subs.map(async (s) => {
              const eta = etaByUser.get(s.user_id as string);
              if (!eta) return;
              try {
                const payload = await buildPushPayload(
                  {
                    data: {
                      title: "Tu entrega va con retraso",
                      body: `Vamos un poco retrasados. Nueva hora estimada: ${formatEtaNY(eta)}.`,
                      url: "https://www.hazorex.com/mis-pedidos",
                      tag: "delivery-delay",
                    },
                    options: { ttl: 1800, urgency: "high" as const, topic: "delay" },
                  },
                  {
                    endpoint: s.endpoint as string,
                    expirationTime: null,
                    keys: { p256dh: s.p256dh as string, auth: s.auth as string },
                  },
                  vapid,
                );
                const resp = await fetch(s.endpoint as string, {
                  method: payload.method,
                  headers: payload.headers,
                  body: payload.body.buffer.slice(
                    payload.body.byteOffset,
                    payload.body.byteOffset + payload.body.byteLength,
                  ) as ArrayBuffer,
                });
                if (resp.status === 404 || resp.status === 410) {
                  await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
                } else if (resp.ok) {
                  notified++;
                }
              } catch (err) {
                console.warn("delay push error", err);
              }
            }),
          );
        }
      }
    } catch (err) {
      console.error("reportRouteDelay: push block error", err);
    }

    return { stops: stops.length, notified, nextEta };
  });
