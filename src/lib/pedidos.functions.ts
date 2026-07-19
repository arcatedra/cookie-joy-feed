import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PedidoItem = {
  id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal_item: number;
};

export type Pedido = {
  id: string;
  numero_pedido: string;
  estado: string;
  subtotal: number;
  costo_envio: number;
  impuestos: number;
  total: number;
  moneda: string;
  direccion_envio: Record<string, unknown> | null;
  creado_en: string;
  items: PedidoItem[];
};

export const listMyPedidos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const { data, error } = await supabase
      .from("pedidos")
      .select(
        `id,numero_pedido,estado,subtotal,costo_envio,impuestos,total,moneda,direccion_envio,creado_en,
         pedido_items(id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal_item)`,
      )
      .eq("cliente_id", userId)
      .order("creado_en", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Array<Pedido & { pedido_items: PedidoItem[] }>).map((p) => ({
      id: p.id,
      numero_pedido: p.numero_pedido,
      estado: p.estado,
      subtotal: Number(p.subtotal),
      costo_envio: Number(p.costo_envio),
      impuestos: Number(p.impuestos),
      total: Number(p.total),
      moneda: p.moneda,
      direccion_envio: p.direccion_envio ?? null,
      creado_en: p.creado_en,
      items: (p.pedido_items ?? []).map((it) => ({
        id: it.id,
        producto_id: it.producto_id,
        nombre_producto: it.nombre_producto,
        precio_unitario: Number(it.precio_unitario),
        cantidad: it.cantidad,
        subtotal_item: Number(it.subtotal_item),
      })),
    })) as Pedido[];
  });

export const getMySuscripcion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const { data, error } = await supabase
      .from("suscripciones")
      .select(
        "id,plan,precio,moneda,estado,stripe_subscription_id,fecha_inicio,fecha_renovacion,fecha_cancelacion,creado_en",
      )
      .eq("cliente_id", userId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
