// Centralized list of NYC delivery zones used across the app
// (driver application form, header "Deliver to..." selector, admin, etc.)
export const NYC_DELIVERY_ZONES: readonly string[] = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Otras áreas",
] as const;

export type NycDeliveryZone = (typeof NYC_DELIVERY_ZONES)[number];

export const NYC_BOROUGHS = NYC_DELIVERY_ZONES.filter((zone) => zone !== "Otras áreas");

export function zoneForPostalCode(zones: Array<{ name: string; borough?: string; zip_codes: string[]; activo?: boolean }>, zip: string) {
  return zones.find((zone) => zone.activo !== false && zone.zip_codes.includes(zip));
}
