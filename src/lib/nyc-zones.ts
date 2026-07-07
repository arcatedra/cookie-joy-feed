// Centralized list of NYC delivery zones used across the app
// (driver application form, header "Deliver to..." selector, admin, etc.)
export const NYC_DELIVERY_ZONES: readonly string[] = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Otra zona",
] as const;

export type NycDeliveryZone = (typeof NYC_DELIVERY_ZONES)[number];
