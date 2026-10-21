import type { SupabaseClient } from "@supabase/supabase-js";
import { pricingFromRows, tierForWeight, weightFeeCents, type PricingSettings } from "./pricing";
import { resolveStaticPrice } from "./catalog-prices.server";

export const COOKIE_DEFAULT_GRAMS = 110;
const GRAMS_PER_LB = 453.59237;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type CookieShippingItem = { id: string; name: string; price: number; qty: number; image?: string };

export function cookieUnitWeightLb(product: { peso_lb?: number | null; peso_gramos?: number | null } = {}) {
  if (Number.isFinite(product.peso_lb) && Number(product.peso_lb) > 0) return Number(product.peso_lb);
  if (Number.isFinite(product.peso_gramos) && Number(product.peso_gramos) > 0) return Number(product.peso_gramos) / GRAMS_PER_LB;
  return COOKIE_DEFAULT_GRAMS / GRAMS_PER_LB;
}

export function cookiePackCount(id: string) {
  const pack = /^(?:p(6|9|12)|custom-pack-(6|9|12)-\d+)$/.exec(id);
  return pack ? Number(pack[1] ?? pack[2]) : 1;
}

export function cookieWeightDelivery(items: Array<{ qty: number; unitWeightLb: number }>, pricing: PricingSettings) {
  let weightLb = 0;
  for (const item of items) {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.unitWeightLb) || item.unitWeightLb <= 0) throw new Error("Cantidad o peso de galletas inválido.");
    weightLb += item.qty * item.unitWeightLb;
  }
  if (!Number.isFinite(weightLb)) throw new Error("Peso de galletas inválido.");
  const overLimit = weightLb > pricing.weightMaxLb;
  const deliveryCents = tierForWeight(weightLb, pricing).feeCents + weightFeeCents(weightLb, pricing);
  return { weightLb, deliveryCents, overLimit, maxWeightLb: pricing.weightMaxLb };
}

/** Same trusted catalog and settings for the public quote and authenticated checkout. */
export async function resolveCookieShipping(db: SupabaseClient, items: CookieShippingItem[]) {
  const ids = [...new Set(items.filter(it => UUID_RE.test(it.id)).map(it => it.id))];
  const [{ data: rows, error: productError }, { data: settings, error: pricingError }] = await Promise.all([
    ids.length ? db.from("productos").select("id,nombre,precio,disponible").in("id", ids) : Promise.resolve({ data: [], error: null }),
    db.from("pricing_settings").select("key,value"),
  ]);
  if (productError || pricingError || !settings) throw new Error("No se pudieron verificar los productos y la entrega. Inténtalo de nuevo.");
  const products = new Map((rows ?? []).map(row => [String(row.id), row]));
  const pricedItems = items.map(it => {
    if (UUID_RE.test(it.id)) {
      const product = products.get(it.id);
      if (!product || product.disponible === false || !Number.isFinite(Number(product.precio)) || Number(product.precio) <= 0) throw new Error("Uno de los productos de tu carrito ya no está disponible.");
      return { ...it, price: Number(product.precio), name: String(product.nombre), unitWeightLb: cookieUnitWeightLb() };
    }
    const price = resolveStaticPrice(it.id, it.price);
    if (price === null) throw new Error("Uno de los productos de tu carrito ya no está disponible.");
    return { ...it, price, unitWeightLb: cookiePackCount(it.id) * cookieUnitWeightLb() };
  });
  const pricing = pricingFromRows(settings);
  const shipping = cookieWeightDelivery(pricedItems, pricing);
  const subtotalCents = pricedItems.reduce((sum, it) => sum + Math.round(it.price * 100) * it.qty, 0);
  return { ...shipping, subtotalCents, pricedItems, pricing };
}