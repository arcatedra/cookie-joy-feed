// Reference (estimated) first-year prices in USD across major registrars.
// These are not live prices — they're shown as guidance. The "buy" link
// opens Namecheap's search/registration page with the domain prefilled.
export type TldPricing = {
  tld: string;
  priceUsd: number;
  note?: "promo" | "premium";
};

export const TLD_PRICING: Record<string, TldPricing> = {
  com: { tld: "com", priceUsd: 12 },
  net: { tld: "net", priceUsd: 14 },
  org: { tld: "org", priceUsd: 13 },
  io: { tld: "io", priceUsd: 35, note: "premium" },
  co: { tld: "co", priceUsd: 30 },
  app: { tld: "app", priceUsd: 18 },
  dev: { tld: "dev", priceUsd: 18 },
  shop: { tld: "shop", priceUsd: 4, note: "promo" },
  store: { tld: "store", priceUsd: 5, note: "promo" },
  online: { tld: "online", priceUsd: 4, note: "promo" },
  xyz: { tld: "xyz", priceUsd: 2, note: "promo" },
  management: { tld: "management", priceUsd: 30 },
};

export const DEFAULT_TLDS = ["com", "net", "org", "io", "co", "app", "shop", "store"];

export function buyUrlFor(domain: string): string {
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
}

export function pricingFor(domain: string): TldPricing | undefined {
  const tld = domain.split(".").slice(1).join(".").toLowerCase();
  return TLD_PRICING[tld];
}
