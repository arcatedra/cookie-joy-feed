import { useState } from "react";
import { Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ProductRatingProps {
  productId: string;
  productName: string;
  size?: "sm" | "md";
}

export function ProductRating({ productId, productName, size = "md" }: ProductRatingProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [showReview, setShowReview] = useState(false);

  const ratingsQ = useQuery({
    queryKey: ["product-rating", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ratings")
        .select("stars, user_id")
        .eq("product_id", productId);
      if (error) throw error;
      const rows = data ?? [];
      const avg = rows.length ? rows.reduce((s, r) => s + r.stars, 0) / rows.length : 0;
      const my = user ? rows.find((r) => r.user_id === user.id)?.stars ?? 0 : 0;
      return { avg, count: rows.length, my };
    },
  });

  const rate = useMutation({
    mutationFn: async ({ stars, reviewText }: { stars: number; reviewText?: string }) => {
      if (!user) throw new Error("not-auth");
      const { error } = await supabase
        .from("product_ratings")
        .upsert(
          { product_id: productId, user_id: user.id, stars, review: reviewText || null },
          { onConflict: "product_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-rating", productId] });
      toast.success(t("ratings.thanks"));
      setShowReview(false);
      setReview("");
    },
    onError: (e: Error) => {
      if (e.message === "not-auth") toast.error(t("ratings.signInToRate"));
      else toast.error(e.message);
    },
  });

  const onStar = (n: number) => {
    if (!user) { toast.error(t("ratings.signInToRate")); return; }
    rate.mutate({ stars: n });
    setShowReview(true);
  };

  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const avg = ratingsQ.data?.avg ?? 0;
  const count = ratingsQ.data?.count ?? 0;
  const my = ratingsQ.data?.my ?? 0;
  const display = hover || my || Math.round(avg);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={(e) => { e.stopPropagation(); onStar(n); }}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <Star
                className={`${starSize} ${n <= display ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {avg > 0 ? avg.toFixed(1) : "—"} ({count})
        </span>
      </div>
      {showReview && user && (
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => { e.preventDefault(); rate.mutate({ stars: my, reviewText: review }); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={t("ratings.writeReview", { product: productName })}
            maxLength={500}
            className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            {t("ratings.save")}
          </button>
        </form>
      )}
      {!user && hover > 0 && (
        <Link to="/auth" className="text-[10px] font-semibold text-cta hover:underline">
          {t("ratings.signInToRate")}
        </Link>
      )}
    </div>
  );
}
