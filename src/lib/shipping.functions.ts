import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quoteShipping, type ShippingQuote } from "./shipping";

interface AppSettingsRow {
  mile_shipping_enabled: boolean;
  shipping_base_price: number | string;
  shipping_price_per_mile: number | string;
}

const updateSchema = z.object({
  mile_shipping_enabled: z.boolean(),
  shipping_base_price: z.number().min(0).max(1000),
  shipping_price_per_mile: z.number().min(0).max(1000),
});

const quoteSchema = z.object({
  from: z.object({ lat: z.number(), lng: z.number() }),
  to: z.object({ lat: z.number(), lng: z.number() }),
});

/** Public: anyone signed-in can read whether the mile shipping feature is on. */
export const getShippingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("mile_shipping_enabled, shipping_base_price, shipping_price_per_mile")
      .eq("id", true)
      .maybeSingle<AppSettingsRow>();
    if (error) throw new Error(error.message);
    return {
      mile_shipping_enabled: data?.mile_shipping_enabled ?? false,
      shipping_base_price: Number(data?.shipping_base_price ?? 0),
      shipping_price_per_mile: Number(data?.shipping_price_per_mile ?? 0),
    };
  });

/** Admin only: update toggle and fees. */
export const updateShippingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("app_settings")
      .update({
        mile_shipping_enabled: data.mile_shipping_enabled,
        shipping_base_price: data.shipping_base_price,
        shipping_price_per_mile: data.shipping_price_per_mile,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Compute a shipping quote. Returns null when the feature toggle is off,
 * so callers fall back to subscription-based delivery count.
 */
export const quoteShippingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => quoteSchema.parse(d))
  .handler(async ({ data, context }): Promise<ShippingQuote | null> => {
    const { data: settings, error } = await context.supabase
      .from("app_settings")
      .select("mile_shipping_enabled, shipping_base_price, shipping_price_per_mile")
      .eq("id", true)
      .maybeSingle<AppSettingsRow>();
    if (error) throw new Error(error.message);
    if (!settings?.mile_shipping_enabled) return null;
    return quoteShipping(data.from, data.to, {
      basePrice: Number(settings.shipping_base_price),
      pricePerMile: Number(settings.shipping_price_per_mile),
    });
  });
