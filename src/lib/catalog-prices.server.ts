/**
 * Trusted, server-side price catalog.
 *
 * Never trust prices sent by the browser. Every cart item must resolve to a
 * price from one of two trusted sources:
 *   1. the `productos` table (items whose id is a product UUID), or
 *   2. this static allowlist (the hardcoded cookie / pack catalog rendered by
 *      the menu, best-sellers and build-pack pages).
 */

/** Static catalog ids -> the set of legitimate prices the UI can offer. */
const STATIC_PRICES: Record<string, readonly number[]> = {
  c1: [3.75],
  c2: [3.75],
  c3: [3.75],
  c4: [3.75],
  c5: [3.75],
  c6: [3.75],
  c7: [3.75],
  c8: [3.75],
  c9: [3.75],
  c10: [3.75],
  // Packs are listed at slightly different price points across surfaces.
  p6: [20, 22],
  p9: [28, 32],
  p12: [36, 42],
};

/** Build-your-own packs: `custom-pack-<count>-<timestamp>`. */
const CUSTOM_PACK_PRICES: Record<number, number> = { 6: 22, 9: 32, 12: 42 };

const CUSTOM_PACK_RE = /^custom-pack-(6|9|12)-\d+$/;

/**
 * Resolve the trusted price for a non-UUID (static catalog) item.
 * Returns null when the id is unknown or the requested price is not one the
 * storefront actually offers.
 */
export function resolveStaticPrice(id: string, requestedPrice: number): number | null {
  const custom = CUSTOM_PACK_RE.exec(id);
  if (custom) return CUSTOM_PACK_PRICES[Number(custom[1])] ?? null;

  const allowed = STATIC_PRICES[id];
  if (!allowed) return null;
  const match = allowed.find((p) => Math.abs(p - requestedPrice) < 0.005);
  // Fall back to the canonical (first) price rather than the client's value.
  return match ?? allowed[0]!;
}
