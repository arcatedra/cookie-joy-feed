/**
 * Entrega de pedidos de tienda por repartidores:
 * lista de disponibles, tomar pedido, pasos y asignación manual del admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HEAVY_LB = 45;

function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

async function assertAdmin(db: any, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Solo administradores.");
}

async function myDriver(admin: any, userId: string) {
  const [{ data: d }, { data: v }] = await Promise.all([
    admin
      .from("drivers")
      .select("id, full_name, work_zone, application_status")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("driver_vehicles").select("vehicle_type").eq("driver_id", userId),
  ]);
  if (!d) throw new Error("No tienes una postulación de repartidor.");
  const hasCar = (v ?? []).some((x: any) => ["auto", "carro", "car"].includes(x.vehicle_type));
  return { ...d, hasCar };
}

function earnings(o: any): number {
  return (
    Math.round(
      (Number(o.envio_repartidor ?? 0) +
        Number(o.cargo_peso_repartidor ?? 0) +
        Number(o.propina ?? 0)) *
        100,
    ) / 100
  );
}

export interface DeliveryCard {
  id: string;
  numero: string;
  tienda: string;
  tiendaDireccion: string;
  zona: string;
  zip: string;
  pesoLb: number;
  articulos: number;
  gananciaUsd: number;
  fechaEntrega: string | null;
  estadoEntrega: string | null;
  clienteDireccion: string | null;
}

async function buildCards(admin: any, orders: any[], showClientAddress: boolean) {
  if (orders.length === 0) return [] as DeliveryCard[];
  const bizIds = [...new Set(orders.map((o) => o.business_id))];
  const [{ data: bizs }, { data: items }] = await Promise.all([
    admin.from("businesses").select("id, business_name, address, city").in("id", bizIds),
    admin
      .from("store_order_items")
      .select("order_id, cantidad, cantidad_real")
      .in("order_id", orders.map((o) => o.id)),
  ]);
  const bizById = new Map((bizs ?? []).map((b: any) => [b.id, b]));
  const count = new Map<string, number>();
  for (const it of items ?? []) {
    count.set(it.order_id, (count.get(it.order_id) ?? 0) + Number(it.cantidad_real ?? it.cantidad ?? 0));
  }
  return orders.map((o): DeliveryCard => {
    const b: any = bizById.get(o.business_id) ?? {};
    const a = o.direccion_envio ?? {};
    return {
      id: o.id,
      numero: o.numero_pedido,
      tienda: b.business_name ?? "Tienda",
      tiendaDireccion: [b.address, b.city].filter(Boolean).join(", "),
      zona: a.city ?? "",
      zip: a.zip ?? "",
      pesoLb: Number(o.peso_total_lb ?? 0),
      articulos: count.get(o.id) ?? 0,
      gananciaUsd: earnings(o),
      fechaEntrega: o.fecha_entrega ?? null,
      estadoEntrega: o.estado_entrega ?? null,
      clienteDireccion: showClientAddress
        ? [a.street, a.apt, a.city, a.zip].filter(Boolean).join(", ")
        : null,
    };
  });
}

const ORDER_COLS =
  "id, numero_pedido, business_id, direccion_envio, peso_total_lb, envio_repartidor, cargo_peso_repartidor, propina, fecha_entrega, estado, estado_entrega, repartidor_id";

/** Pedidos disponibles para el repartidor + los que ya tiene tomados. */
export const listDriverStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).userId as string;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const d = await myDriver(admin, userId);
    if (d.application_status !== "aprobado") {
      return { aprobado: false, disponibles: [], mios: [] };
    }
    const today = todayET();
    const [{ data: avail }, { data: mine }] = await Promise.all([
      admin
        .from("store_orders")
        .select(ORDER_COLS)
        .eq("estado", "listo")
        .is("repartidor_id", null)
        .or(`fecha_entrega.is.null,fecha_entrega.lte.${today}`)
        .order("created_at", { ascending: true })
        .limit(200),
      admin
        .from("store_orders")
        .select(ORDER_COLS)
        .eq("repartidor_id", userId)
        .eq("estado", "listo")
        .order("tomado_en", { ascending: true }),
    ]);
    const zone = d.work_zone && d.work_zone !== "Otra zona" ? String(d.work_zone).toLowerCase() : null;
    const filtered = (avail ?? []).filter((o: any) => {
      if (Number(o.peso_total_lb ?? 0) > HEAVY_LB && !d.hasCar) return false;
      if (zone && String(o.direccion_envio?.city ?? "").toLowerCase() !== zone) return false;
      return true;
    });
    return {
      aprobado: true,
      disponibles: await buildCards(admin, filtered, false),
      mios: await buildCards(admin, mine ?? [], true),
    };
  });

export const claimStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const { error } = await db.rpc("claim_store_order", { p_order_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function finishDelivery(orderId: string) {
  const { grantReferralRewardForOrder } = await import("./referral-rewards.server");
  await grantReferralRewardForOrder(orderId);
  const { registerDriverPayoutForOrder } = await import("./driver-payouts.server");
  await registerDriverPayoutForOrder(orderId);
  try {
    const { adminDb, transferDriverPayout } = await import("./payouts.server");
    const db = adminDb();
    const { data: p } = await db.from("driver_payouts").select("id").eq("order_id", orderId).maybeSingle();
    if (p) return await transferDriverPayout(p.id, db);
  } catch (e) {
    console.error("[store-delivery] transferencia inmediata falló", orderId, e);
  }
  return null;
}

export const advanceStoreDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        step: z.enum(["recogido", "en_camino", "entregado"]),
        photoPath: z.string().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const { error } = await db.rpc("advance_store_delivery", {
      p_order_id: data.id,
      p_step: data.step,
      p_photo: data.photoPath ?? null,
    });
    if (error) throw new Error(error.message);
    let pagado = false;
    if (data.step === "entregado") {
      const res = await finishDelivery(data.id);
      pagado = !!(res?.ok && !res.skipped);
    }
    return { ok: true, pagado };
  });

/** Foto de entrega (URL firmada) para el cliente, la tienda o el admin. */
export const getStoreDeliveryPhoto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    // RLS: solo si el usuario puede ver el pedido (cliente, tienda o admin).
    const { data: o } = await db
      .from("store_orders")
      .select("id, foto_entrega_url")
      .eq("id", data.id)
      .maybeSingle();
    if (!o?.foto_entrega_url) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await (supabaseAdmin as any).storage
      .from("delivery-photos")
      .createSignedUrl(o.foto_entrega_url, 3600);
    return { url: signed?.signedUrl ?? null };
  });

// ---------------- Admin ----------------

export const adminListStoreDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin((context as any).supabase, (context as any).userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const [{ data: orders }, { data: drivers }] = await Promise.all([
      admin
        .from("store_orders")
        .select(ORDER_COLS + ", repartidor_nombre")
        .in("estado", ["listo", "entregado"])
        .order("created_at", { ascending: false })
        .limit(150),
      admin
        .from("drivers")
        .select("id, full_name, work_zone")
        .eq("application_status", "aprobado")
        .order("full_name"),
    ]);
    const cards = await buildCards(admin, orders ?? [], true);
    const byId = new Map((orders ?? []).map((o: any) => [o.id, o]));
    return {
      pedidos: cards.map((c) => {
        const o: any = byId.get(c.id);
        return { ...c, estado: o.estado, repartidorId: o.repartidor_id, repartidorNombre: o.repartidor_nombre };
      }),
      repartidores: drivers ?? [],
    };
  });

export const adminAssignStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ id: z.string().uuid(), driverId: z.string().uuid().nullable() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin((context as any).supabase, (context as any).userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    let nombre: string | null = null;
    if (data.driverId) {
      const { data: d } = await admin
        .from("drivers")
        .select("full_name, application_status")
        .eq("id", data.driverId)
        .maybeSingle();
      if (!d || d.application_status !== "aprobado") throw new Error("Repartidor no aprobado.");
      nombre = d.full_name;
    }
    const { data: upd, error } = await admin
      .from("store_orders")
      .update({
        repartidor_id: data.driverId,
        repartidor_nombre: nombre,
        estado_entrega: data.driverId ? "tomado" : null,
        tomado_en: data.driverId ? new Date().toISOString() : null,
        recogido_en: null,
        en_camino_en: null,
      })
      .eq("id", data.id)
      .eq("estado", "listo")
      .select("id");
    if (error) throw new Error(error.message);
    if (!upd?.length) throw new Error("Solo se pueden asignar pedidos listos y no entregados.");
    return { ok: true };
  });
