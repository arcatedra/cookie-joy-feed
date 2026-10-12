import { barcodeVariants } from "./barcode-rules";

/** Producto de la misma tienda que ya tiene este código (ignorando `exceptId`). */
export async function findBarcodeOwner(db: any, businessId: string, code: string, exceptId?: string) {
  let q = db
    .from("store_products")
    .select("id, nombre, nombre_en, codigos_barras")
    .eq("business_id", businessId)
    .overlaps("codigos_barras", barcodeVariants(code))
    .limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data?.[0] ?? null) as { id: string; nombre: string; nombre_en: string | null; codigos_barras: string[] } | null;
}

/** Agrega un código a un producto (sin duplicar). */
export async function addBarcodeToProduct(db: any, productId: string, code: string) {
  const { data: p, error } = await db.from("store_products").select("codigos_barras, codigo_barras").eq("id", productId).single();
  if (error) throw new Error(error.message);
  const codes: string[] = p.codigos_barras ?? [];
  if (codes.includes(code)) return;
  const { error: uErr } = await db
    .from("store_products")
    .update({ codigos_barras: [...codes, code], ...(p.codigo_barras ? {} : { codigo_barras: code }) })
    .eq("id", productId);
  if (uErr) throw new Error(uErr.message);
}

/** Aviso push simple al cliente (si tiene notificaciones activadas). */
export async function pushToCustomer(userId: string, title: string, body: string, url: string, tag: string) {
  try {
    const pub = process.env["VAPID_PUBLIC_KEY"];
    const priv = process.env["VAPID_PRIVATE_KEY"];
    if (!pub || !priv) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (!subs?.length) return;
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject: process.env["VAPID_SUBJECT"] ?? "mailto:hazorex0@gmail.com", publicKey: pub, privateKey: priv };
    await Promise.all(
      subs.map(async (s: any) => {
        try {
          const payload = await buildPushPayload(
            { data: { title, body, url, tag }, options: { ttl: 3600, urgency: "high" as const } },
            { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
            vapid,
          );
          const resp = await fetch(s.endpoint, {
            method: payload.method,
            headers: payload.headers,
            body: payload.body.buffer.slice(payload.body.byteOffset, payload.body.byteOffset + payload.body.byteLength) as ArrayBuffer,
          });
          if (resp.status === 404 || resp.status === 410) {
            await (supabaseAdmin as any).from("push_subscriptions").delete().eq("id", s.id);
          }
        } catch (e) {
          console.warn("[picking] push error", e);
        }
      }),
    );
  } catch (e) {
    console.error("[picking] push failed", e);
  }
}
