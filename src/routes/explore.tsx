import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronLeft, Star, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgCookiesCream from "@/assets/ins-cookies-cream.jpg";
import imgSnicker from "@/assets/ins-snickerdoodle.jpg";
import imgSugar from "@/assets/ins-sugar.jpg";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgOatmeal from "@/assets/ins-oatmeal.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";
import imgMM from "@/assets/ins-mm.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgMint from "@/assets/ins-mint.jpg";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Browse Cookies — Oys" },
      { name: "description", content: "Explore our full range of artisanal gourmet cookies at Oys." },
    ],
  }),
  component: ExplorePage,
});

const products = [
  { id: 1, name: "Chocolate Chunk", price: "$3.75", rating: 5, reviews: 272, image: imgChocChunk, description: "Buttery vanilla with semi-sweet chunks." },
  { id: 2, name: "Cookies 'N Cream", price: "$3.75", rating: 5, reviews: 184, image: imgCookiesCream, description: "Crushed cookies & white chocolate." },
  { id: 3, name: "Snickerdoodle", price: "$3.75", rating: 5, reviews: 125, image: imgSnicker, description: "Soft, warm cinnamon sugar." },
  { id: 4, name: "Sugar", price: "$3.75", rating: 5, reviews: 134, image: imgSugar, description: "Melt-in-your-mouth buttery sweet." },
  { id: 5, name: "Double Chocolate Chunk", price: "$3.75", rating: 5, reviews: 197, image: imgDoubleChoc, description: "Dark cocoa packed with chunks." },
  { id: 6, name: "Oatmeal Raisin", price: "$3.75", rating: 5, reviews: 98, image: imgOatmeal, description: "Warm oats and plump raisins." },
  { id: 7, name: "White Chocolate Macadamia", price: "$3.75", rating: 5, reviews: 95, image: imgWhiteMac, description: "Coconut-buttery, tropical vibes." },
  { id: 8, name: "Classic with M&M'S®", price: "$3.75", rating: 5, reviews: 79, image: imgMM, description: "Candy-coated chocolate twist." },
  { id: 9, name: "Peanut Butter Chip", price: "$3.75", rating: 5, reviews: 56, image: imgPB, description: "Soft vanilla with peanut butter chips." },
  { id: 10, name: "Double Chocolate Mint", price: "$3.75", rating: 5, reviews: 23, image: imgMint, description: "Warm chocolate with cool mint." },
];

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">({reviews})</span>
    </div>
  );
}

function ExplorePage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]">
            Browse Cookies
          </h1>
          <div className="h-10 w-10" />
        </div>
      </header>

      {/* Search & Filters */}
      <section className="px-5 pt-5">
        <div className="flex items-center gap-3 rounded-full bg-card px-5 py-3.5 shadow-sm ring-1 ring-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cookies, flavors, boxes…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            Sort <span className="text-muted-foreground">∨</span>
          </button>
          <button className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            Price <span className="text-muted-foreground">∨</span>
          </button>
        </div>
      </section>

      {/* Product Grid */}
      <section className="mt-6 px-5">
        <div className="grid grid-cols-2 gap-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="relative overflow-hidden rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-cream">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={512}
                  height={512}
                />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-foreground leading-tight">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p>
                <div className="mt-1">
                  <StarRating rating={p.rating} reviews={p.reviews} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{p.price}</span>
                </div>
              </div>
              <button
                className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-orange text-white shadow-md"
                aria-label={`Add ${p.name} to cart`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
