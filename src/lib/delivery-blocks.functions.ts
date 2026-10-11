import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertBlockOrderCount, assertPublishableBlock, deliveryAddressKey, groupStopsByBuilding, manualBlockPay, missingSameBuildingOrders } from "./delivery-block-rules";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Solo un administrador puede gestionar bloques.");
  return context.supabase;
}

const settingsSchema = z.object({
  enabled: z.boolean(), min_orders: z.number().int().min(3), suggested_pay: z.number().min(0), minimum_hourly: z.number().positive(),
  small_max_lb: z.number().positive(), medium_max_lb: z.number().positive(), included_lb: z.number().positive(), max_order_lb: z.number().positive(),
  small_fee: z.number().min(0), medium_fee: z.number().min(0), large_fee: z.number().min(0), extra_lb_fee: z.number().min(0),
  elevator_fee: z.number().min(0), stairs_fee: z.number().min(0), elevator_minutes: z.number().int().min(0), stairs_minutes: z.number().int().min(0),
  heavy_item_lb: z.number().positive(), light_stops_hour: z.number().positive(), other_stops_hour: z.number().positive(), auto_assign_minutes: z.number().int().min(1),
  unassigned_alert_hours: z.number().int().positive(), bike_lb: z.number().positive(), cargo_bike_lb: z.number().positive(), motorcycle_lb: z.number().positive(),
  car_lb: z.number().positive(), van_lb: z.number().positive(), weekly_bonus: z.number().min(0), bonus_min_blocks: z.number().int().positive(),
  bonus_on_time_pct: z.number().min(0).max(100), bonus_rating: z.number().min(1).max(5), late_cancel_hours: z.number().int().positive(),
  priority_penalty_days: z.number().int().min(0), overtime_minutes: z.number().int().min(0), no_show_minutes: z.number().int().min(0), claim_hours: z.number().int().positive(),
}).refine((v) => v.small_max_lb < v.medium_max_lb && v.medium_max_lb < v.included_lb && v.included_lb < v.max_order_lb, "Los límites de peso deben estar en orden creciente.");

export const getDeliveryBlockAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await requireAdmin(context);
  const [{ data: settings, error: settingsError }, { data: blocks, error: blocksError }] = await Promise.all([
    db.from("delivery_block_settings").select("*").eq("singleton", true).single(),
    db.from("delivery_blocks").select("*, delivery_block_stops(id,size_label,heavy_items,has_cold_items,door_service,status)").order("starts_at", { ascending: true }).limit(100),
  ]);
  if (settingsError) throw new Error(settingsError.message);
  if (blocksError) throw new Error(blocksError.message);
  const now = Date.now();
  return { settings, blocks: (blocks ?? []).map((block: any) => ({ ...block, needsDriverAlert: !block.assigned_driver_id && block.status === "published" && new Date(block.starts_at).getTime() - now <= Number(settings.unassigned_alert_hours) * 3_600_000 })) };
});

type BlockCandidate = { id: string; kind: "store" | "cookie"; numero_pedido: string; label: string; fecha_entrega: string | null; weight: number; propina: number; key: string; zip: string };

/** Paid, unassigned store + cookie orders that are not yet in a block or an old cookie route. */
async function loadBlockCandidates(db: any): Promise<BlockCandidate[]> {
  const [{ data: store, error: e1 }, { data: cookies, error: e2 }, { data: used }, { data: routed }] = await Promise.all([
    db.from("store_orders").select("id,numero_pedido,fecha_entrega,peso_total_lb,propina,direccion_envio,businesses(business_name)")
      .gt("monto_capturado",0).in("estado",["listo","entregado"]).is("repartidor_id",null).order("fecha_entrega").order("created_at"),
    db.from("pedidos").select("id,numero_pedido,propina,direccion_envio,creado_en")
      .gt("monto_capturado",0).not("estado","in","(entregado,cancelado,reembolsado)").order("creado_en"),
    db.from("delivery_block_stops").select("store_order_id,cookie_order_id"),
    db.from("route_stops").select("order_id"),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const inBlock = new Set((used ?? []).flatMap((s: any) => [s.store_order_id, s.cookie_order_id]).filter(Boolean));
  const inRoute = new Set((routed ?? []).map((r: any) => r.order_id));
  const zipOf = (a: any) => String(a?.zip ?? a?.postal_code ?? "").replace(/\D/g,"").slice(0,5);
  return [
    ...(store ?? []).filter((o: any) => !inBlock.has(o.id)).map((o: any): BlockCandidate => ({ id:o.id, kind:"store", numero_pedido:o.numero_pedido, label:o.businesses?.business_name ?? "Tienda", fecha_entrega:o.fecha_entrega, weight:Number(o.peso_total_lb ?? 0), propina:Number(o.propina ?? 0), key:deliveryAddressKey(o.direccion_envio), zip:zipOf(o.direccion_envio) })),
    ...(cookies ?? []).filter((o: any) => !inBlock.has(o.id) && !inRoute.has(o.id)).map((o: any): BlockCandidate => ({ id:o.id, kind:"cookie", numero_pedido:o.numero_pedido, label:"Hazorex Galletas", fecha_entrega:null, weight:COOKIE_STOP_WEIGHT_LB, propina:Number(o.propina ?? 0), key:deliveryAddressKey(o.direccion_envio), zip:zipOf(o.direccion_envio) })),
  ];
}

const COOKIE_STOP_WEIGHT_LB = 3;

export const listOrdersForDeliveryBlocks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await requireAdmin(context);
  return loadBlockCandidates(db);
});

export const updateDeliveryBlockSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => settingsSchema.parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("delivery_block_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const blockSchema = z.object({ zoneId: z.string().uuid().nullable(), zoneName: z.string().trim().min(1).max(120), startsAt: z.string().datetime(), estimatedMinutes: z.number().int().min(60).max(240), basePay: z.number().positive(), orderIds: z.array(z.string().uuid()).min(3).max(40) });
export const createDeliveryBlockDraft = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => blockSchema.parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { data: settings } = await db.from("delivery_block_settings").select("min_orders,minimum_hourly").eq("singleton",true).single();
    assertBlockOrderCount(data.orderIds.length, { minOrders:Number(settings?.min_orders ?? 3) } as any);
    assertPublishableBlock(data.basePay, data.estimatedMinutes, { minimumHourlyUsd:Number(settings?.minimum_hourly ?? 23) } as any);
    const candidates = await loadBlockCandidates(db);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const selected = data.orderIds.map((id) => byId.get(id));
    if (selected.some((o) => !o)) throw new Error("Algún pedido ya no está disponible (sin cobrar, ya en otro lote o ya entregado). Recarga la lista.");
    const chosen = selected as BlockCandidate[];
    const missing = missingSameBuildingOrders(chosen, candidates);
    if (missing.length) throw new Error(`Hay ${missing.length} pedido(s) más en el mismo edificio: deben ir en este lote (${missing.map((id) => "#" + byId.get(id)!.numero_pedido).join(", ")}).`);
    const ordered = groupStopsByBuilding(chosen);
    const { data: block, error } = await db.from("delivery_blocks").insert({ zone_id: data.zoneId, zone_name: data.zoneName, dispatch_date: data.startsAt.slice(0,10), starts_at: data.startsAt, estimated_minutes: data.estimatedMinutes, base_pay: data.basePay, committed_pay: data.basePay, tips_total: ordered.reduce((sum,o)=>sum+o.propina,0), status: "draft" }).select("id").single();
    if (error) throw new Error(error.message);
    const stops = ordered.map((o, index) => {
      const sameBuildingAsPrev = index > 0 && o.key && ordered[index-1].key === o.key;
      return { block_id: block.id, store_order_id: o.kind === "store" ? o.id : null, cookie_order_id: o.kind === "cookie" ? o.id : null, address_key: o.key, sequence_number: index + 1, size_label: o.weight<=15?"Pequeño":o.weight<=30?"Mediano":"Grande", weight_lb: o.weight, estimated_minutes: sameBuildingAsPrev ? 4 : o.weight<=15?12:15 };
    });
    const { error: stopError } = await db.from("delivery_block_stops").insert(stops);
    if (stopError) { await db.from("delivery_blocks").delete().eq("id", block.id); throw new Error(stopError.message); }
    return { id: block.id };
  });

const paySchema = z.object({ blockId: z.string().uuid(), increase: z.number().min(0), doorBonusEnabled: z.boolean(), doorBonusAmount: z.number().min(0) });
export const updateDeliveryBlockPay = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => paySchema.parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { data: block, error: readError } = await db.from("delivery_blocks").select("base_pay,committed_pay,status").eq("id",data.blockId).single();
    if (readError) throw new Error(readError.message);
    const committed = manualBlockPay(Number(block.base_pay), data.increase, data.doorBonusEnabled, data.doorBonusAmount);
    if (["reserved","assigned","active","completed"].includes(block.status) && committed < Number(block.committed_pay)) throw new Error("No puedes reducir un pago ya aceptado.");
    const { error } = await db.from("delivery_blocks").update({ manual_increase: data.increase, door_bonus_enabled: data.doorBonusEnabled, door_bonus_amount: data.doorBonusEnabled ? data.doorBonusAmount : 0, committed_pay: committed }).eq("id",data.blockId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const publishDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId: z.string().uuid() }).parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { data: block, error: readError } = await db.from("delivery_blocks").select("committed_pay,estimated_minutes,delivery_block_stops(count)").eq("id",data.blockId).single();
    if (readError) throw new Error(readError.message);
    const { data: settings } = await db.from("delivery_block_settings").select("minimum_hourly,min_orders").eq("singleton",true).single();
    assertPublishableBlock(Number(block.committed_pay), Number(block.estimated_minutes), { minimumHourlyUsd:Number(settings?.minimum_hourly ?? 23) } as any);
    assertBlockOrderCount(Number(block.delivery_block_stops?.[0]?.count ?? 0), { minOrders:Number(settings?.min_orders ?? 3) } as any);
    const { error } = await db.from("delivery_blocks").update({ status:"published", published_at:new Date().toISOString() }).eq("id",data.blockId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyAvailableDeliveryBlocks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: settings } = await context.supabase.from("delivery_block_settings").select("enabled").eq("singleton",true).single();
  if (!settings?.enabled) return { enabled:false as const, blocks:[] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("my_available_delivery_blocks", { p_driver:context.userId });
  if (error) throw new Error(error.message);
  return { enabled:true as const, blocks:data ?? [] };
});

export const reserveDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId:z.string().uuid() }).parse(raw)).handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: driverError } = await context.supabase.from("drivers").select("id").eq("id",context.userId).eq("application_status","aprobado").single();
    if (driverError) throw new Error("Tu cuenta de repartidor no está aprobada.");
    const { data: reservationId, error } = await supabaseAdmin.rpc("reserve_delivery_block", { p_block:data.blockId, p_driver:context.userId });
    if (error) throw new Error(error.message);
    return { reservationId:reservationId as string };
  });