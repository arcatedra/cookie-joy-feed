/**
 * Compra en el súper con verificación por código de barras.
 * Pueden usarlo: admin, el dueño de la tienda o el repartidor asignado al pedido.
 * No cobra ni reembolsa nada: el cobro final se hace al marcar "Listo" con lo realmente comprado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { productHasBarcode, pickedQuantity, pickedProductId, validateUnitQuantity } from "./barcode-rules";

const EDITABLE = ["confirmado", "preparando", "cobro_fallido"];
const code = z.string().regex(/^\d{8,14}$/, "Código de barras inválido");

async function authorizeOrder(context: any, orderId: string) {
  const userId = context.userId as string;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const adb = supabaseAdmin as any;
  const { data: order, error } = await adb
    .from("store_orders")
    .select("id, numero_pedido, estado, reemplazo, business_id, cliente_id, repartidor_id, direccion_envio, notas")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error("Pedido no encontrado.");
  let allowed = order.repartidor_id === userId;
  let isOwner = false;
  if (!allowed) {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    allowed = Boolean(isAdmin);
  }
  {
    const { data: biz } = await adb.from("businesses").select("owner_user_id").eq("id", order.business_id).maybeSingle();
    isOwner = biz?.owner_user_id === userId;
    allowed = allowed || isOwner;
  }
  if (!allowed) throw new Error("No tienes acceso a este pedido.");
  return { adb, order, userId, isOwner };
}

async function loadItem(context: any, itemId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: item } = await (supabaseAdmin as any).from("store_order_items").select("*").eq("id", itemId).maybeSingle();
  if (!item) throw new Error("Artículo no encontrado.");
  const auth = await authorizeOrder(context, item.order_id);
  if (!EDITABLE.includes(auth.order.estado)) throw new Error("Este pedido ya no se puede modificar.");
  const productId = pickedProductId(item);
  const { data: product } = productId
    ? await auth.adb.from("store_products").select("id, nombre, nombre_en, codigos_barras, vendido_por_lb, peso_lb").eq("id", productId).maybeSingle()
    : { data: null };
  return { ...auth, item, product };
}

async function setPick(adb: any, itemId: string, userId: string, patch: Record<string, unknown>) {
  const { error } = await adb
    .from("store_order_items")
    .update({ ...patch, picked_by: userId, picked_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

/** Pedido + artículos con foto, códigos y si se vende por libra. */
export const getPickingOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { adb, order, isOwner } = await authorizeOrder(context, data.id);
    const { data: items } = await adb.from("store_order_items").select("*").eq("order_id", order.id).order("created_at");
    const ids = (items ?? []).filter((i: any) => i.pick_status !== "no_habia").map((i: any) => pickedProductId(i)).filter(Boolean);
    const { data: prods } = ids.length
      ? await adb.from("store_products").select("id, nombre_en, imagen_url, codigos_barras, vendido_por_lb, peso_lb, tamano").in("id", ids)
      : { data: [] };
    const byId = new Map<string, any>((prods ?? []).map((p: any) => [p.id, p]));
    const out = await Promise.all(
      (items ?? []).map(async (it: any) => {
        const p = byId.get(it.pick_status === "no_habia" ? it.product_id : pickedProductId(it));
        let img: string | null = p?.imagen_url ?? it.foto_especial ?? null;
        if (img && !/^https?:|^\//.test(img)) {
          const { data: s } = await adb.storage.from("store-media").createSignedUrl(img, 3600);
          img = s?.signedUrl ?? null;
        }
        return {
          id: it.id as string,
          nombre: it.nombre_producto as string,
          nombre_en: (p?.nombre_en ?? null) as string | null,
          tamano: (p?.tamano ?? it.tamano_especial ?? null) as string | null,
          especial: it.especial === true,
          marca: (it.marca_especial ?? null) as string | null,
          cantidad: Number(it.cantidad),
          cantidad_real: it.pick_status === "pendiente" ? null : pickedQuantity(it, p),
          precio_unitario: Number(it.precio_unitario),
          imagen: img,
          tieneCodigo: (p?.codigos_barras ?? []).length > 0,
          porLibra: p?.vendido_por_lb === true,
          pesoLb: Number(p?.peso_lb ?? 0),
          pick_status: (it.pick_status ?? "pendiente") as string,
          picked_weight_lb: it.picked_weight_lb == null ? null : Number(it.picked_weight_lb),
          replacement_name: (it.replacement_name ?? null) as string | null,
        };
      }),
    );
    const dir = (order.direccion_envio ?? {}) as Record<string, unknown>;
    return {
      id: order.id as string,
      numero: order.numero_pedido as string,
      estado: order.estado as string,
      editable: EDITABLE.includes(order.estado),
      canCapture: isOwner,
      reemplazo: (order.reemplazo ?? "similar") as string,
      telefonoCliente: order.reemplazo === "llamar" ? String(dir["phone"] ?? dir["telefono"] ?? "") || null : null,
      notas: (order.notas ?? null) as string | null,
      items: out,
    };
  });

/** Escanea un artículo. Coincide → Encontrado. Distinto → rechazado. Sin código → pedir confirmación para guardarlo. */
export const pickScanItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ itemId: z.string().uuid(), code, saveAsProductCode: z.boolean().default(false) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { adb, item, product, userId, order } = await loadItem(context, data.itemId);
    if (!product) throw new Error("Este artículo no está ligado a un producto del catálogo.");
    const codes: string[] = product.codigos_barras ?? [];
    if (codes.length === 0) {
      if (!data.saveAsProductCode) return { result: "needs_confirm" as const };
      const { findBarcodeOwner, addBarcodeToProduct } = await import("./barcode.server");
      const owner = await findBarcodeOwner(adb, order.business_id, data.code, product.id);
      if (owner) return { result: "wrong" as const, belongsTo: owner.nombre };
      await addBarcodeToProduct(adb, product.id, data.code);
    } else if (!productHasBarcode(codes, data.code)) {
      return { result: "wrong" as const };
    }
    await setPick(adb, item.id, userId, { pick_status: "encontrado", cantidad_real: item.cantidad_real ?? Number(item.cantidad), scanned_barcode: data.code, replacement_product_id: null, replacement_name: null });
    return { result: "found" as const };
  });

/** Productos por libra: Encontrado + peso real (sin escaneo). */
export const pickWeighItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ itemId: z.string().uuid(), weightLb: z.number().positive().max(200) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { adb, item, product, userId } = await loadItem(context, data.itemId);
    if (product?.vendido_por_lb !== true) throw new Error("Este producto se vende por unidad: escanéalo.");
    const replacing = item.pick_status === "reemplazado";
    if (!Number.isFinite(Number(product.peso_lb)) || Number(product.peso_lb) <= 0) throw new Error("Falta el peso por unidad del producto.");
    const real = pickedQuantity({ ...item, picked_weight_lb: data.weightLb }, product);
    await setPick(adb, item.id, userId, {
      pick_status: replacing ? "reemplazado" : "encontrado", cantidad_real: real, picked_weight_lb: data.weightLb,
      ...(replacing ? {} : { replacement_product_id: null, replacement_name: null }),
    });
    return { ok: true as const };
  });

/** Reemplazo escaneado (respeta la preferencia del cliente). Se cobra al precio del artículo original. */
export const pickReplaceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ itemId: z.string().uuid(), code }).parse(raw))
  .handler(async ({ data, context }) => {
    const { adb, item, userId, order, product } = await loadItem(context, data.itemId);
    if (order.reemplazo === "no_reemplazar") throw new Error("El cliente pidió no reemplazar. Marca \"No había\".");
    if (product && productHasBarcode(product.codigos_barras, data.code)) {
      throw new Error("Ese es el mismo producto: usa \"Escanear\" para marcarlo como encontrado.");
    }
    const { findBarcodeOwner } = await import("./barcode.server");
    const owner = await findBarcodeOwner(adb, order.business_id, data.code);
    if (!owner) return { ok: false as const, reason: "unknown" as const };
    await setPick(adb, item.id, userId, {
      pick_status: "reemplazado",
      cantidad_real: item.cantidad_real ?? Number(item.cantidad),
      picked_weight_lb: null,
      scanned_barcode: data.code,
      replacement_product_id: owner.id,
      replacement_name: owner.nombre,
    });
    return { ok: true as const, name: owner.nombre };
  });

/** No había: sale del cobro final y se avisa al cliente. */
export const pickNotFoundItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ itemId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { adb, item, userId, order } = await loadItem(context, data.itemId);
    await setPick(adb, item.id, userId, { pick_status: "no_habia", cantidad_real: 0, scanned_barcode: null, picked_weight_lb: null, replacement_product_id: null, replacement_name: null });
    const { data: prof } = await adb.from("profiles").select("locale").eq("id", order.cliente_id).maybeSingle();
    const en = String(prof?.locale ?? "es").startsWith("en");
    const { pushToCustomer } = await import("./barcode.server");
    await pushToCustomer(
      order.cliente_id,
      en ? "An item was out of stock" : "Un artículo no estaba disponible",
      en
        ? `${item.nombre_producto} was not available. It won't be charged.`
        : `${item.nombre_producto} no estaba disponible. No se te cobrará.`,
      `https://www.hazorex.com/mis-pedidos/tienda/${order.id}`,
      `pick-${item.id}`,
    );
    return { ok: true as const };
  });

/** Deshacer: vuelve el artículo a pendiente. */
export const pickResetItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ itemId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { adb, item } = await loadItem(context, data.itemId);
    const { error } = await adb
      .from("store_order_items")
      .update({ pick_status: "pendiente", cantidad_real: null, scanned_barcode: null, picked_weight_lb: null, replacement_product_id: null, replacement_name: null, picked_by: null, picked_at: null })
      .eq("id", item.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Ajusta unidades parciales sin sustituir la verificación del producto. */
export const pickSetQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ itemId: z.string().uuid(), quantity: z.number().min(0).max(999) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { adb, item, product, userId } = await loadItem(context, data.itemId);
    if (product?.vendido_por_lb === true) throw new Error("Este artículo requiere peso real en libras.");
    if (!["encontrado", "reemplazado"].includes(item.pick_status)) throw new Error("Primero verifica el artículo escaneándolo.");
    const quantity = validateUnitQuantity(data.quantity, item.cantidad);
    await setPick(adb, item.id, userId, { cantidad_real: quantity });
    return { ok: true as const };
  });
