/**
 * Panel de administración: transferencias a repartidores y a súpers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(db: any, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Solo administradores.");
}

export interface TransferRow {
  id: string;
  kind: "repartidor" | "negocio";
  nombre: string;
  pedido: string | null;
  montoUsd: number;
  estado: "pagado" | "pendiente" | "fallido";
  error: string | null;
  fecha: string;
}

export const listTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = (context as any).supabase;
    await assertAdmin(db, (context as any).userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [{ data: payouts }, { data: orders }] = await Promise.all([
      admin
        .from("driver_payouts")
        .select("id, driver_id, order_id, amount_usd, status, last_error, created_at, paid_at")
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("store_orders")
        .select(
          "id, numero_pedido, business_id, monto_capturado, monto_transferido_negocio, transferido_en, capturado_en, costo_envio, cargo_peso, cargo_servicio, propina, credito_aplicado",
        )
        .not("capturado_en", "is", null)
        .order("capturado_en", { ascending: false })
        .limit(200),
    ]);

    const driverIds = [...new Set((payouts ?? []).map((p: any) => p.driver_id))];
    const bizIds = [...new Set((orders ?? []).map((o: any) => o.business_id))];
    const [{ data: drivers }, { data: bizs }, { data: orderNums }] = await Promise.all([
      driverIds.length
        ? admin.from("drivers").select("id, full_name, stripe_payouts_enabled").in("id", driverIds)
        : Promise.resolve({ data: [] }),
      bizIds.length
        ? admin
            .from("businesses")
            .select("id, business_name, stripe_payouts_enabled")
            .in("id", bizIds)
        : Promise.resolve({ data: [] }),
      (payouts ?? []).length
        ? admin
            .from("store_orders")
            .select("id, numero_pedido")
            .in("id", (payouts ?? []).map((p: any) => p.order_id))
        : Promise.resolve({ data: [] }),
    ]);
    const driverById = new Map((drivers ?? []).map((d: any) => [d.id, d]));
    const bizById = new Map((bizs ?? []).map((b: any) => [b.id, b]));
    const numById = new Map((orderNums ?? []).map((o: any) => [o.id, o.numero_pedido]));

    const { storeShareCents } = await import("./payouts.server");

    const rows: TransferRow[] = [];

    for (const p of payouts ?? []) {
      rows.push({
        id: p.id,
        kind: "repartidor",
        nombre: (driverById.get(p.driver_id) as any)?.full_name ?? "Repartidor",
        pedido: (numById.get(p.order_id) as string | undefined) ?? null,
        montoUsd: Number(p.amount_usd ?? 0),
        estado: p.status === "pagado" ? "pagado" : p.status === "fallido" ? "fallido" : "pendiente",
        error: p.last_error ?? null,
        fecha: p.paid_at ?? p.created_at,
      });
    }

    for (const o of orders ?? []) {
      const cents = storeShareCents(o);
      rows.push({
        id: o.id,
        kind: "negocio",
        nombre: (bizById.get(o.business_id) as any)?.business_name ?? "Negocio",
        pedido: o.numero_pedido ?? null,
        montoUsd: o.transferido_en ? Number(o.monto_transferido_negocio ?? 0) : cents / 100,
        estado: o.transferido_en ? "pagado" : "pendiente",
        error: null,
        fecha: o.transferido_en ?? o.capturado_en,
      });
    }

    rows.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return rows;
  });

export const retryTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["repartidor", "negocio"]) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    await assertAdmin(db, (context as any).userId);
    const { transferDriverPayout, transferStoreOrder } = await import("./payouts.server");
    const res =
      data.kind === "repartidor"
        ? await transferDriverPayout(data.id)
        : await transferStoreOrder(data.id);
    if (!res.ok) throw new Error(res.error ?? "No se pudo transferir.");
    return { ok: true, skipped: res.skipped ?? false };
  });
