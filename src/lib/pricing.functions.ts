/**
 * Lectura y edición de los precios del modelo por pedido (/admin/precios).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRICING_KEYS, pricingFromRows, type PricingSettings, type DeliveryZone } from "./pricing";

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Ajustes de precio + días de ruta por zona. Público (se necesita para cotizar). */
export const getPricingConfig = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient() as any;
  const [{ data: rows }, { data: zones }, { data: dz }] = await Promise.all([
    db.from("pricing_settings").select("key, value"),
    db.from("zone_delivery_days").select("zone, days"),
    db.from("delivery_zones").select("id, name, borough, zip_codes, route_days, activo").order("borough").order("name"),
  ]);
  return {
    pricing: pricingFromRows(rows),
    deliveryZones: (dz ?? []) as DeliveryZone[],
    zones: (zones ?? []) as Array<{ zone: string; days: number[] }>,
  };
});

const updateSchema = z.object({
  pricing: z.record(z.string(), z.number()).optional(),
  zones: z.array(z.object({ zone: z.string().min(1).max(80), days: z.array(z.number().int().min(0).max(6)).max(7) })).optional(),
});

export const updatePricingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => updateSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const userId = (context as any).userId as string;
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo un administrador puede cambiar los precios.");

    const validKeys = new Set(Object.values(PRICING_KEYS));
    const rows = Object.entries(data.pricing ?? {})
      .filter(([k, v]) => validKeys.has(k) && Number.isFinite(v))
      .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    if (rows.length > 0) {
      const { error } = await db.from("pricing_settings").upsert(rows, { onConflict: "key" });
      if (error) throw new Error("No se pudieron guardar los precios.");
    }
    if (data.zones?.length) {
      const { error } = await db
        .from("zone_delivery_days")
        .upsert(
          data.zones.map((z) => ({ zone: z.zone, days: z.days, updated_at: new Date().toISOString() })),
          { onConflict: "zone" },
        );
      if (error) throw new Error("No se pudieron guardar los días de ruta.");
    }
    return { ok: true as const };
  });

export type { PricingSettings };

const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  borough: z.string().trim().max(60).default(""),
  zip_codes: z.array(z.string().trim().regex(/^\d{5}$/)).max(500),
  route_days: z.array(z.number().int().min(0).max(6)).max(7),
  activo: z.boolean().default(true),
});

async function requireAdmin(context: any) {
  const db = context.supabase;
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Solo un administrador puede cambiar las zonas.");
  return db;
}

export const saveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => zoneSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const row = { name: data.name, borough: data.borough, zip_codes: data.zip_codes, route_days: data.route_days, activo: data.activo };
    const q = data.id
      ? db.from("delivery_zones").update(row).eq("id", data.id)
      : db.from("delivery_zones").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
