/**
 * Supermercado propio de Hazorex: catálogo administrado por el admin.
 * "Dónde comprarlo" vive en store_product_sourcing (solo admin / repartidor asignado).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HOUSE_STORE_SLUG, houseProductSchema, type HouseProductInput } from "./house-store-rules";

async function requireAdmin(context: any) {
  const db = context.supabase;
  const { data: isAdmin } = await db.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Solo un administrador puede usar esta pantalla.");
  return db;
}

async function houseStore(db: any) {
  const { data, error } = await db.from("businesses").select("id").eq("slug", HOUSE_STORE_SLUG).maybeSingle();
  if (error || !data) throw new Error("No se encontró la tienda Hazorex Supermercado.");
  const { data: cats } = await db.from("store_categories").select("id, nombre").eq("business_id", data.id);
  return { id: data.id as string, cats: (cats ?? []) as { id: string; nombre: string }[] };
}

/** Orden de "Más vendidos": solo ids de productos y unidades totales (sin datos de compradores). */
export const getHouseBestSellers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: biz } = await db.from("businesses").select("id").eq("slug", HOUSE_STORE_SLUG).maybeSingle();
  if (!biz) return [] as string[];
  const { data } = await db
    .from("store_order_items")
    .select("product_id, cantidad, store_orders!inner(business_id, monto_capturado)")
    .eq("store_orders.business_id", biz.id)
    .gt("store_orders.monto_capturado", 0)
    .limit(5000);
  const totals = new Map<string, number>();
  for (const r of (data ?? []) as any[]) totals.set(r.product_id, (totals.get(r.product_id) ?? 0) + Number(r.cantidad ?? 0));
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);
});

export const adminListHouseProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const store = await houseStore(db);
    const { data, error } = await db
      .from("store_products")
      .select("*, store_product_sourcing(super, direccion)")
      .eq("business_id", store.id)
      .order("orden");
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const catName = new Map(store.cats.map((c) => [c.id, c.nombre]));
    const products = await Promise.all(
      (data ?? []).map(async (p: any) => {
        let imagenUrl: string | null = p.imagen_url;
        if (imagenUrl && !/^https?:|^\//.test(imagenUrl)) {
          const { data: s } = await (supabaseAdmin as any).storage.from("store-media").createSignedUrl(imagenUrl, 3600);
          imagenUrl = s?.signedUrl ?? null;
        }
        const src = Array.isArray(p.store_product_sourcing) ? p.store_product_sourcing[0] : p.store_product_sourcing;
        return { ...p, imagenUrl, categoria: catName.get(p.category_id) ?? "", super: src?.super ?? "", direccion: src?.direccion ?? "" };
      }),
    );
    return { storeId: store.id, products };
  });

async function upsertProducts(db: any, items: HouseProductInput[]) {
  const store = await houseStore(db);
  const catId = new Map(store.cats.map((c) => [c.nombre, c.id]));
  let saved = 0;
  for (const it of items) {
    const row: any = {
      business_id: store.id,
      category_id: catId.get(it.categoria) ?? null,
      nombre: it.nombre,
      nombre_en: it.nombre_en || null,
      precio: it.precio,
      precio_anterior: it.precio_anterior && it.precio_anterior > it.precio ? it.precio_anterior : null,
      tamano: it.tamano || null,
      peso_lb: it.peso_lb,
      vendido_por_lb: it.vendido_por_lb,
      unidad: it.vendido_por_lb ? "lb" : "unidad",
      disponible: it.disponible,
      stock: it.stock,
    };
    if (it.imagen_url !== null) row.imagen_url = it.imagen_url;
    const q = it.id
      ? db.from("store_products").update(row).eq("id", it.id).eq("business_id", store.id).select("id").single()
      : db.from("store_products").insert(row).select("id").single();
    const { data, error } = await q;
    if (error) throw new Error(`${it.nombre}: ${error.message}`);
    const { error: sErr } = await db
      .from("store_product_sourcing")
      .upsert({ product_id: data.id, super: it.super, direccion: it.direccion }, { onConflict: "product_id" });
    if (sErr) throw new Error(`${it.nombre}: ${sErr.message}`);
    saved++;
  }
  return saved;
}

export const adminSaveHouseProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => houseProductSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await upsertProducts(db, [data]);
    return { ok: true as const };
  });

export const adminBulkHouseProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ items: z.array(houseProductSchema).min(1).max(1000) }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    return { saved: await upsertProducts(db, data.items) };
  });

export const adminQuickUpdateHouseProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string().uuid(),
      precio: z.number().min(0.01).max(10000).optional(),
      precio_anterior: z.number().min(0).max(10000).nullable().optional(),
      stock: z.number().int().min(0).max(100000).nullable().optional(),
      disponible: z.boolean().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const store = await houseStore(db);
    const { id, ...patch } = data;
    const { error } = await db.from("store_products").update(patch).eq("id", id).eq("business_id", store.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Sube una foto (data URL, máx. ~3 MB) al almacenamiento privado de tiendas. */
export const adminUploadHouseImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ dataUrl: z.string().max(4_500_000).regex(/^data:image\/(png|jpe?g|webp);base64,/) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const [meta, b64] = data.dataUrl.split(",");
    const ext = meta.includes("png") ? "png" : meta.includes("webp") ? "webp" : "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `house/${crypto.randomUUID()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).storage
      .from("store-media")
      .upload(path, bytes, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
    if (error) throw new Error("No se pudo subir la foto.");
    return { path };
  });
