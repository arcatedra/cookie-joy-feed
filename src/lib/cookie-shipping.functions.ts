import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const cookieQuoteItemsSchema = z.array(z.object({
  id: z.string().min(1).max(120), name: z.string().min(1).max(200),
  price: z.number().positive().max(10000), qty: z.number().int().positive(),
  image: z.string().max(2000).optional(),
})).min(1);

export const quoteCookieShipping = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => cookieQuoteItemsSchema.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const url = process.env["SUPABASE_URL"];
    if (!key || !url) throw new Error("No se pudo calcular la entrega.");
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { resolveCookieShipping } = await import("./cookie-shipping.server");
    const { pricedItems: _items, pricing, ...quote } = await resolveCookieShipping(db, data);
    return { ...quote, tiers: { smallMaxLb: pricing.tierSmallMaxLb, mediumMaxLb: pricing.tierMediumMaxLb, largeMaxLb: pricing.weightIncludedLb, smallUsd: pricing.tierSmallFeeUsd, mediumUsd: pricing.tierMediumFeeUsd, largeUsd: pricing.tierLargeFeeUsd, extraUsd: pricing.weightExtraPerLbUsd } };
  });