import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FavoriteRow = {
  id: string;
  productHandle: string;
  productTitle: string | null;
  productImageUrl: string | null;
  productPriceAmount: number | null;
  productPriceCurrency: string | null;
  createdAt: string;
};

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FavoriteRow[]> => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select(
        "id, product_handle, product_title, product_image_url, product_price_amount, product_price_currency, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      productHandle: r.product_handle as string,
      productTitle: (r.product_title as string | null) ?? null,
      productImageUrl: (r.product_image_url as string | null) ?? null,
      productPriceAmount:
        r.product_price_amount == null ? null : Number(r.product_price_amount),
      productPriceCurrency: (r.product_price_currency as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  });

const addSchema = z.object({
  productHandle: z.string().trim().min(1).max(200),
  productTitle: z.string().trim().max(300).nullable().optional(),
  productImageUrl: z.string().trim().url().max(1000).nullable().optional(),
  productPriceAmount: z.number().nonnegative().max(1_000_000).nullable().optional(),
  productPriceCurrency: z.string().trim().max(10).nullable().optional(),
});

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => addSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("favorites").upsert(
      {
        user_id: context.userId,
        product_handle: data.productHandle,
        product_title: data.productTitle ?? null,
        product_image_url: data.productImageUrl ?? null,
        product_price_amount: data.productPriceAmount ?? null,
        product_price_currency: data.productPriceCurrency ?? null,
      },
      { onConflict: "user_id,product_handle" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ productHandle: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("product_handle", data.productHandle);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
