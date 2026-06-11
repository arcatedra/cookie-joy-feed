// Shared shipping types & simulated distance/fee calculator.
// Pure client-safe module — no server imports.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ShippingQuote {
  distanceMiles: number;
  basePrice: number;
  pricePerMile: number;
  total: number;
}

/**
 * Haversine distance in miles between two geo points.
 * Used as a simulated "maps API" so we don't depend on any external provider yet.
 */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Uber-style fare: base + per-mile * distance. */
export function quoteShipping(
  from: GeoPoint,
  to: GeoPoint,
  cfg: { basePrice: number; pricePerMile: number },
): ShippingQuote {
  const distanceMiles = Math.round(haversineMiles(from, to) * 100) / 100;
  const total =
    Math.round((cfg.basePrice + cfg.pricePerMile * distanceMiles) * 100) / 100;
  return {
    distanceMiles,
    basePrice: cfg.basePrice,
    pricePerMile: cfg.pricePerMile,
    total,
  };
}
