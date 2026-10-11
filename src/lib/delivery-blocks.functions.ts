import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertBlockOrderCount, assertPublishableBlock, manualBlockPay } from "./delivery-block-rules";

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

export const getDeliveryBlockSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth:{ persistSession:false, autoRefreshToken:false } });
  const { data, error } = await db.from("delivery_block_settings").select("*").eq("singleton",true).single();
  if (error) throw new Error("No se pudo cargar la configuración de entrega.");
  return data;
});

export const listOrdersForDeliveryBlocks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await requireAdmin(context);
  const { data, error } = await db.from("store_orders")
    .select("id,numero_pedido,fecha_entrega,peso_total_lb,propina,direccion_envio,monto_capturado,estado,created_at,businesses(business_name)")
    .gt("monto_capturado",0).in("estado",["listo","entregado"]).is("repartidor_id",null).order("fecha_entrega").order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const updateDeliveryBlockSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => settingsSchema.parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("delivery_block_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const blockSchema = z.object({ zoneId: z.string().uuid().nullable(), zoneName: z.string().trim().min(1).max(120), startsAt: z.string().datetime(), estimatedMinutes: z.number().int().min(60).max(240), basePay: z.number().positive(), orderIds: z.array(z.string().uuid()).min(3) });
export const createDeliveryBlockDraft = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => blockSchema.parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { data: settings } = await db.from("delivery_block_settings").select("min_orders,minimum_hourly").eq("singleton",true).single();
    assertBlockOrderCount(data.orderIds.length, { minOrders:Number(settings?.min_orders ?? 3) } as any);
    assertPublishableBlock(data.basePay, data.estimatedMinutes, { minimumHourlyUsd:Number(settings?.minimum_hourly ?? 23) } as any);
    const { data: orders, error: orderError } = await db.from("store_orders").select("id,peso_total_lb,propina,estado,monto_capturado").in("id", data.orderIds);
    if (orderError || orders?.length !== data.orderIds.length) throw new Error("No se pudieron validar todos los pedidos.");
    if (orders.some((order: any) => Number(order.monto_capturado ?? 0) <= 0)) throw new Error("Solo se pueden agrupar pedidos efectivamente cobrados.");
    const { data: block, error } = await db.from("delivery_blocks").insert({ zone_id: data.zoneId, zone_name: data.zoneName, dispatch_date: data.startsAt.slice(0,10), starts_at: data.startsAt, estimated_minutes: data.estimatedMinutes, base_pay: data.basePay, committed_pay: data.basePay, tips_total: orders.reduce((sum: number,o: any)=>sum+Number(o.propina??0),0), status: "draft" }).select("id").single();
    if (error) throw new Error(error.message);
    const stops = orders.map((order: any, index: number) => ({ block_id: block.id, store_order_id: order.id, sequence_number: index + 1, size_label: Number(order.peso_total_lb)<=15?"Pequeño":Number(order.peso_total_lb)<=30?"Mediano":"Grande", weight_lb: Number(order.peso_total_lb), estimated_minutes: Number(order.peso_total_lb)<=15?12:15 }));
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
    const { error } = await db.from("delivery_blocks").update({ manual_increase: data.increase, door_bonus_enabled: data.doorBonusEnabled, door_bonus_amount: data.doorBonusEnabled ? data.doorBonusAmount : 0 }).eq("id",data.blockId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const publishDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId: z.string().uuid() }).parse(raw)).handler(async ({ context, data }) => {
    const db = await requireAdmin(context);
    const { data: block, error: readError } = await db.from("delivery_blocks").select("base_pay,estimated_minutes,delivery_block_stops(count)").eq("id",data.blockId).single();
    if (readError) throw new Error(readError.message);
    const { data: settings } = await db.from("delivery_block_settings").select("minimum_hourly,min_orders").eq("singleton",true).single();
    assertPublishableBlock(Number(block.base_pay), Number(block.estimated_minutes), { minimumHourlyUsd:Number(settings?.minimum_hourly ?? 23) } as any);
    assertBlockOrderCount(Number(block.delivery_block_stops?.[0]?.count ?? 0), { minOrders:Number(settings?.min_orders ?? 3) } as any);
    const { error } = await db.from("delivery_blocks").update({ status:"published", published_at:new Date().toISOString() }).eq("id",data.blockId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyAvailableDeliveryBlocks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: settings } = await context.supabase.from("delivery_block_settings").select("enabled").eq("singleton",true).single();
  if (!settings?.enabled) return { enabled:false as const, blocks:[] };
  const { data, error } = await context.supabase.from("delivery_blocks").select("id,zone_name,starts_at,estimated_minutes,committed_pay,door_bonus_enabled,door_bonus_amount,estimated_trips,requires_thermal_bag,delivery_block_stops(id,size_label,heavy_items,has_cold_items,door_service)").eq("status","published").eq("is_open",true).is("assigned_driver_id",null).order("starts_at");
  if (error) throw new Error(error.message);
  return { enabled:true as const, blocks:data ?? [] };
});

export const reserveDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId:z.string().uuid() }).parse(raw)).handler(async ({ context, data }) => {
    const { data, error } = await context.supabase.rpc("reserve_delivery_block", { p_block:data.blockId });
    if (error) throw new Error(error.message);
    return { reservationId:data as string };
  });