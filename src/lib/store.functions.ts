/**
 * Server functions del panel del negocio (dueño autenticado).
 * RLS aplica: cada dueño solo alcanza su propio negocio.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeSchedule, slugify } from "@/lib/store";

const BUCKET = "store-media";

async function signMedia(supabase: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("businesses")
      .select("*")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      horario: normalizeSchedule(data.horario),
      zonas_que_atiende: data.zonas_que_atiende ?? [],
      logoUrl: await signMedia(sb, data.logo_url),
      bannerUrl: await signMedia(sb, data.banner_url),
    };
  });

const dayHours = z.object({
  closed: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
});

const updateStoreInput = z.object({
  descripcion: z.string().max(1000).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  banner_url: z.string().max(500).nullable().optional(),
  horario: z.record(z.string(), dayHours).optional(),
  zonas_que_atiende: z.array(z.string().min(1).max(60)).max(20).optional(),
  slug: z.string().min(3).max(60).optional(),
});

export const updateMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => updateStoreInput.parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: Record<string, unknown> = { ...data };
    if (data.slug) {
      const base = slugify(data.slug);
      if (!base) throw new Error("La dirección web no es válida.");
      patch['slug'] = base;
    }
    const { error } = await sb
      .from("businesses")
      .update(patch)
      .eq("owner_user_id", context.userId);
    if (error) {
      if ((error as any).code === "23505") throw new Error("Esa dirección web ya está en uso.");
      throw error;
    }
    return { ok: true };
  });

async function myBusinessId(context: any): Promise<string> {
  const { data, error } = await (context.supabase as any)
    .from("businesses")
    .select("id")
    .eq("owner_user_id", context.userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No tienes un negocio registrado.");
  return data.id as string;
}

export const listMyCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const businessId = await myBusinessId(context);
    const [cats, prods] = await Promise.all([
      sb.from("store_categories").select("*").eq("business_id", businessId).order("orden"),
      sb.from("store_products").select("*").eq("business_id", businessId).order("orden"),
    ]);
    if (cats.error) throw cats.error;
    if (prods.error) throw prods.error;
    const products = await Promise.all(
      (prods.data ?? []).map(async (p: any) => ({
        ...p,
        imagenUrl: await signMedia(sb, p.imagen_url),
      })),
    );
    return { businessId, categories: cats.data ?? [], products };
  });

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1).max(80),
  orden: z.number().int().min(0).max(999).default(0),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => categoryInput.parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const businessId = await myBusinessId(context);
    const payload = { ...data, business_id: businessId };
    const { error } = data.id
      ? await sb.from("store_categories").update(payload).eq("id", data.id)
      : await sb.from("store_categories").insert(payload);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await myBusinessId(context);
    const { error } = await sb.from("store_categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(600).nullable().optional(),
  precio: z.number().min(0).max(100000),
  unidad: z.string().min(1).max(20),
  imagen_url: z.string().max(500).nullable().optional(),
  disponible: z.boolean().default(true),
  orden: z.number().int().min(0).max(9999).default(0),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => productInput.parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const businessId = await myBusinessId(context);
    const payload = { ...data, business_id: businessId };
    const { error } = data.id
      ? await sb.from("store_products").update(payload).eq("id", data.id)
      : await sb.from("store_products").insert(payload);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await myBusinessId(context);
    const { error } = await sb.from("store_products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setProductAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ id: z.string().uuid(), disponible: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await myBusinessId(context);
    const { error } = await sb
      .from("store_products")
      .update({ disponible: data.disponible })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
