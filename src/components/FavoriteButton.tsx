import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  type FavoriteRow,
} from "@/lib/favorites.functions";

type Props = {
  productHandle: string;
  productTitle?: string | null;
  productImageUrl?: string | null;
  productPriceAmount?: number | null;
  productPriceCurrency?: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function FavoriteButton({
  productHandle,
  productTitle,
  productImageUrl,
  productPriceAmount,
  productPriceCurrency,
  size = "md",
  className = "",
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchList = useServerFn(listFavorites);
  const add = useServerFn(addFavorite);
  const remove = useServerFn(removeFavorite);

  const { data } = useQuery({
    queryKey: ["favorites", user?.id ?? "anon"],
    queryFn: () => fetchList(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const isFavorite = !!data?.some((f: FavoriteRow) => f.productHandle === productHandle);

  const toggle = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return remove({ data: { productHandle } });
      }
      return add({
        data: {
          productHandle,
          productTitle: productTitle ?? null,
          productImageUrl: productImageUrl ?? null,
          productPriceAmount: productPriceAmount ?? null,
          productPriceCurrency: productPriceCurrency ?? null,
        },
      });
    },
    onSuccess: (res) => {
      if (res && "ok" in res && !res.ok) {
        toast.error(res.error ?? t("favorites.error"));
        return;
      }
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["profile-stats"] });
      toast.success(isFavorite ? t("favorites.removed") : t("favorites.added"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.message(t("favorites.signInFirst"));
      navigate({ to: "/auth" });
      return;
    }
    toggle.mutate();
  };

  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const pad = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? t("favorites.remove") : t("favorites.add")}
      className={`grid ${pad} place-items-center rounded-full bg-white/90 backdrop-blur ring-1 ring-border shadow-sm transition hover:bg-white disabled:opacity-50 ${className}`}
    >
      <Heart
        className={`${dim} transition ${
          isFavorite ? "fill-red-500 stroke-red-500" : "stroke-foreground"
        }`}
      />
    </button>
  );
}
