import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  imagen_url: string | null;
  disponible: boolean;
};

function serverPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
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

export const listProductos = createServerFn({ method: "GET" }).handler(
  async (): Promise<Producto[]> => {
    const sb = serverPublicClient();
    const { data, error } = await sb
      .from("productos")
      .select("id,nombre,descripcion,precio,categoria,imagen_url,disponible")
      .eq("disponible", true)
      .order("nombre", { ascending: true });
    if (error) return [];
    return (data ?? []) as Producto[];
  },
);
