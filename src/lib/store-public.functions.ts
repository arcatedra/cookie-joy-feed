/**
 * Lecturas públicas del marketplace de tiendas.
 * Usan la clave publicable (rol anon) y las políticas públicas de RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeSchedule } from "@/lib/store";

const BUCKET = "store-media";

function publicClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function sign(sb: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Tiendas aprobadas, activas y con al menos un producto disponible. */
export const listPublicStores = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient() as any;
  const { data: stores, error } = await sb
    .from("businesses")
    .select("id, slug, business_name, business_type, city, logo_url, zonas_que_atiende")
    .eq("status", "aprobado")
    .eq("activo", true)
    .order("business_name");
  if (error) throw error;
  const list = (stores ?? []) as any[];
  if (list.length === 0) return [];

  const { data: prods, error: pErr } = await sb
    .from("store_products")
    .select("business_id")
    .eq("disponible", true)
    .in("business_id", list.map((s) => s.id));
  if (pErr) throw pErr;
  const withProducts = new Set((prods ?? []).map((p: any) => p.business_id));

  return Promise.all(
    list
      .filter((s) => withProducts.has(s.id))
      .map(async (s) => ({
        ...s,
        zonas_que_atiende: s.zonas_que_atiende ?? [],
        logoUrl: await sign(sb, s.logo_url),
      })),
  );
});

export const getPublicStore = createServerFn({ method: "GET" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient() as any;
    const { data: store, error } = await sb
      .from("businesses")
      .select(
        "id, slug, business_name, business_type, city, address, descripcion, logo_url, banner_url, horario, zonas_que_atiende",
      )
      .eq("slug", data.slug)
      .eq("status", "aprobado")
      .eq("activo", true)
      .maybeSingle();
    if (error) throw error;
    if (!store) return null;

    const [cats, prods] = await Promise.all([
      sb.from("store_categories").select("*").eq("business_id", store.id).order("orden"),
      sb.from("store_products").select("*").eq("business_id", store.id).order("orden"),
    ]);
    if (cats.error) throw cats.error;
    if (prods.error) throw prods.error;

    return {
      store: {
        ...store,
        zonas_que_atiende: store.zonas_que_atiende ?? [],
        horario: normalizeSchedule(store.horario),
        logoUrl: await sign(sb, store.logo_url),
        bannerUrl: await sign(sb, store.banner_url),
      },
      categories: cats.data ?? [],
      products: await Promise.all(
        (prods.data ?? []).map(async (p: any) => ({
          ...p,
          imagenUrl: await sign(sb, p.imagen_url),
        })),
      ),
    };
  });
