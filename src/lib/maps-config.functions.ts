import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the Google Maps JS API browser key to use on the current deployment.
 *
 * Priority:
 *  1. GOOGLE_API_KEY — user-provided key restricted to their custom domains.
 *  2. VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY — Lovable-managed key
 *     (only valid on *.lovable.app / *.lovableproject.com).
 */
export const getMapsBrowserKey = createServerFn({ method: "GET" }).handler(async () => {
  const custom = process.env.GOOGLE_API_KEY;
  const managed = process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ?? null;
  const key = (custom && custom.trim().length > 0 ? custom : managed) ?? null;
  return { key, channel, source: custom ? "custom" : managed ? "managed" : "none" as const };
});
