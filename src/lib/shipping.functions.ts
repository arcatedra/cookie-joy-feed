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

    if (!settings?.mile_shipping_enabled) {
      // Log failed attempt so admins can see it in history.
      const { error: logErr } = await context.supabase.from("shipping_quotes").insert({
        user_id: context.userId,
        from_lat: data.from.lat,
        from_lng: data.from.lng,
        to_lat: data.to.lat,
        to_lng: data.to.lng,
        distance_miles: 0,
        base_price: 0,
        price_per_mile: 0,
        total: 0,
        status: "failed",
        error_message: "Feature disabled",
      });
      if (logErr) console.error("[shipping] failed to log quote:", logErr.message);
      return null;
    }

    const quote = quoteShipping(data.from, data.to, {
      basePrice: Number(settings.shipping_base_price),
      pricePerMile: Number(settings.shipping_price_per_mile),
    });

    // Persist successful quote to history (best-effort).
    const { error: logErr } = await context.supabase.from("shipping_quotes").insert({
      user_id: context.userId,
      from_lat: data.from.lat,
      from_lng: data.from.lng,
      to_lat: data.to.lat,
      to_lng: data.to.lng,
      distance_miles: quote.distanceMiles,
      base_price: quote.basePrice,
      price_per_mile: quote.pricePerMile,
      total: quote.total,
      status: "saved",
    });
    if (logErr) console.error("[shipping] failed to log quote:", logErr.message);

    return quote;
  });

interface ShippingQuoteRow {
  id: string;
  user_id: string;
  from_lat: number | string;
  from_lng: number | string;
  to_lat: number | string;
  to_lng: number | string;
  distance_miles: number | string;
  base_price: number | string;
  price_per_mile: number | string;
  total: number | string;
  created_at: string;
  status: string;
  error_message: string | null;
}

const listFiltersSchema = z.object({
  userQuery: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(["saved", "failed"]).optional(),
});

export interface ShippingQuoteHistoryItem {
  id: string;
  userId: string;
  userName: string | null;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  distanceMiles: number;
  basePrice: number;
  pricePerMile: number;
  total: number;
  createdAt: string;
  status: string;
  errorMessage: string | null;
}

/** Admin only: list shipping quotes with optional filters. */
export const listShippingQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listFiltersSchema.parse(d))
  .handler(async ({ data: filters, context }): Promise<ShippingQuoteHistoryItem[]> => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve user IDs from a display-name search.
    let matchingUserIds: string[] = [];
    const q = filters.userQuery?.trim();
    if (q) {
      const { data: profileMatches } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${q}%`);
      matchingUserIds = (profileMatches ?? []).map((p) => p.id);
    }

    let dbQuery = supabaseAdmin
      .from("shipping_quotes")
      .select(
        "id, user_id, from_lat, from_lng, to_lat, to_lng, distance_miles, base_price, price_per_mile, total, created_at, status, error_message",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (filters.status) {
      dbQuery = dbQuery.eq("status", filters.status);
    }
    if (filters.dateFrom) {
      dbQuery = dbQuery.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      dbQuery = dbQuery.lte("created_at", filters.dateTo);
    }

    if (q) {
      const ids = new Set<string>(matchingUserIds);
      // If the query itself looks like a UUID fragment, also search user_id.
      if (q.length >= 8) {
        const { data: idMatches } = await supabaseAdmin
          .from("shipping_quotes")
          .select("user_id")
          .ilike("user_id", `%${q}%`);
        (idMatches ?? []).forEach((r) => ids.add(r.user_id));
      }
      if (ids.size === 0) {
        // No possible matches, return empty early.
        return [];
      }
      dbQuery = dbQuery.in("user_id", Array.from(ids));
    }

    const { data, error } = await dbQuery.returns<ShippingQuoteRow[]>();
    if (error) throw new Error(error.message);

    // Resolve display names for the returned rows.
    const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
    let nameMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? null]));
    }

    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: nameMap.get(r.user_id) ?? null,
      from: { lat: Number(r.from_lat), lng: Number(r.from_lng) },
      to: { lat: Number(r.to_lat), lng: Number(r.to_lng) },
      distanceMiles: Number(r.distance_miles),
      basePrice: Number(r.base_price),
      pricePerMile: Number(r.price_per_mile),
      total: Number(r.total),
      createdAt: r.created_at,
      status: r.status,
      errorMessage: r.error_message,
    }));
  });
