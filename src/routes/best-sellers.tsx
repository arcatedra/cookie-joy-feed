import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Star, ShoppingCart, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import i18n from "@/i18n";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgSnicker from "@/assets/ins-snickerdoodle.jpg";
import imgSugar from "@/assets/ins-sugar.jpg";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgOatmeal from "@/assets/ins-oatmeal.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";
import imgMM from "@/assets/ins-mm.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgVeganChoc from "@/assets/ins-vegan-choc.jpg";
import imgMint from "@/assets/ins-mint.jpg";
import imgPack6 from "@/assets/pack-6.jpg";
import imgPack9 from "@/assets/pack-9.jpg";
import imgPack12 from "@/assets/pack-12.jpg";

interface BestSeller {
  id: string;
  nameKey: string;
  image: string;
  price: number;
  rating: number;
  reviews: number;
}

const ALL: BestSeller[] = [
  { id: "c1", nameKey: "cookies.c1.name", image: imgChocChunk, price: 3.75, rating: 4.9, reviews: 2310 },
  { id: "c4", nameKey: "cookies.c4.name", image: imgDoubleChoc, price: 3.75, rating: 4.9, reviews: 3104 },
  { id: "p12", nameKey: "packs.p12.name", image: imgPack12, price: 42, rating: 4.9, reviews: 1620 },
  { id: "c7", nameKey: "cookies.c7.name", image: imgMM, price: 3.75, rating: 4.8, reviews: 1740 },
  { id: "p6", nameKey: "packs.p6.name", image: imgPack6, price: 22, rating: 4.9, reviews: 1320 },
  { id: "c2", nameKey: "cookies.c2.name", image: imgSnicker, price: 3.75, rating: 4.7, reviews: 1208 },
  { id: "c6", nameKey: "cookies.c6.name", image: imgWhiteMac, price: 3.75, rating: 4.7, reviews: 980 },
  { id: "p9", nameKey: "packs.p9.name", image: imgPack9, price: 32, rating: 4.9, reviews: 980 },
  { id: "c3", nameKey: "cookies.c3.name", image: imgSugar, price: 3.75, rating: 4.6, reviews: 890 },
  { id: "c8", nameKey: "cookies.c8.name", image: imgPB, price: 3.75, rating: 4.6, reviews: 720 },
  { id: "c5", nameKey: "cookies.c5.name", image: imgOatmeal, price: 3.75, rating: 4.5, reviews: 612 },
  { id: "c10", nameKey: "cookies.c10.name", image: imgMint, price: 3.75, rating: 4.6, reviews: 540 },
  { id: "c9", nameKey: "cookies.c9.name", image: imgVeganChoc, price: 3.75, rating: 4.7, reviews: 450 },
];

export const Route = createFileRoute("/best-sellers")({
  head: () => ({
    meta: [
      { title: i18n.t("bestSellersPage.metaTitle", "Más Vendidas — HAZOREX") },
      { name: "description", content: i18n.t("bestSellersPage.metaDesc", "Las galletas y packs más vendidos de HAZOREX, ordenados por reseñas.") },
      { property: "og:title", content: i18n.t("bestSellersPage.metaTitle", "Más Vendidas — HAZOREX") },
      { property: "og:description", content: i18n.t("bestSellersPage.metaDesc", "Las galletas y packs más vendidos de HAZOREX, ordenados por reseñas.") },
    ],
  }),
  component: BestSellersPage,
});

function BestSellersPage() {
  const { t } = useTranslation();
  const cart = useCart();
  const list = [...ALL].sort((a, b) => b.reviews - a.reviews).slice(0, 12);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-500 text-white">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1a0f0a] md:text-3xl">
            {t("bestSellersPage.title", "Más Vendidas")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("bestSellersPage.subtitle", "Los productos más queridos por nuestros clientes, ordenados por número de reseñas.")}
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((p, i) => {
          const name = t(p.nameKey);
          return (
            <li key={p.id} className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition hover:shadow-md">
              <span className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-[#1a0f0a] text-sm font-black text-amber-400 shadow">
                #{i + 1}
              </span>
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={p.image} alt={name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <Link to="/menu" className="line-clamp-2 text-sm font-semibold text-[#1a0f0a] hover:text-amber-700 hover:underline">
                  {name}
                </Link>
                <div className="flex items-center gap-1.5 text-xs">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{p.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({p.reviews.toLocaleString()})</span>
                </div>
                <div className="text-lg font-bold text-[#1a0f0a]">
                  <span className="text-xs align-top">$</span>{p.price.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cart.add({ id: p.id, name, price: p.price, image: p.image });
                    toast.success(t("reels.addedToCart", { name, defaultValue: "{{name}} added to cart" }));
                  }}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-[#1a0f0a] shadow-sm transition hover:bg-amber-300"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t("searchPage.addToCart", "Agregar al carrito")}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
