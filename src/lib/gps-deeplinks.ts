export type GpsApp = "google" | "waze" | "apple";

export function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export function availableGpsApps(): GpsApp[] {
  const p = detectPlatform();
  if (p === "ios") return ["google", "waze", "apple"];
  return ["google", "waze"];
}

export function gpsDeepLink(app: GpsApp, lat: number, lng: number, label?: string): string {
  const q = encodeURIComponent(label ?? "");
  switch (app) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    case "waze":
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case "apple":
      return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d${q ? `&q=${q}` : ""}`;
  }
}

export const gpsLabel: Record<GpsApp, string> = {
  google: "Google Maps",
  waze: "Waze",
  apple: "Apple Maps",
};

const KEY = "hazorex:preferredGpsApp";

export function getStoredGpsPref(): GpsApp | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(KEY);
  return v === "google" || v === "waze" || v === "apple" ? v : null;
}

export function setStoredGpsPref(app: GpsApp | null) {
  if (typeof localStorage === "undefined") return;
  if (app) localStorage.setItem(KEY, app);
  else localStorage.removeItem(KEY);
}

/** Simple Haversine distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
