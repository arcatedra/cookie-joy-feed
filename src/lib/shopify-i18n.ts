// Map Shopify product handles (stored in Spanish on the storefront) to the
// i18n cookie keys used across /explore and /menu, so /shop and /product/$handle
// can display translated names/descriptions in every supported language.

import type { TFunction } from "i18next";

export const SHOPIFY_HANDLE_TO_KEY: Record<string, string> = {
  "trozos-de-chocolate": "c1",
  "snickerdoodle": "c2",
  "azucar": "c3",
  "doble-trozo-de-chocolate": "c4",
  "avena-con-pasas": "c5",
  "chocolate-blanco-y-macadamia": "c6",
  "clasica-con-m-ms": "c7",
  "chips-de-mantequilla-de-mani": "c8",
  "trozos-de-chocolate-vegana": "c9",
  "doble-chocolate-y-menta": "c10",
};

/** Returns localized {name, description} for a Shopify product, with fallback
 *  to the raw storefront values (Spanish) when no mapping is available. */
export function localizeShopifyProduct(
  handle: string | null | undefined,
  storefrontTitle: string,
  storefrontDescription: string,
  t: TFunction,
): { name: string; description: string } {
  const key = handle ? SHOPIFY_HANDLE_TO_KEY[handle] : undefined;
  if (!key) return { name: storefrontTitle, description: storefrontDescription };
  const name = t(`cookies.${key}.name`, storefrontTitle);
  const description = t(`cookies.${key}.desc`, storefrontDescription);
  return { name, description };
}
