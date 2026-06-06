import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronLeft, Star, Plus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

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
  {
    id: 1,
    name: "Classic Choc Chip",
    price: "$12.99",
    rating: 5,
    reviews: 12,
    image: product1,
  },
  {
    id: 2,
    name: "Oatmeal Raisin",
    price: "$11.49",
    rating: 5,
    reviews: 8,
    image: product2,
  },
  {
    id: 3,
    name: "Peanut Butter Blast",
    price: "$13.99",
    rating: 5,
    reviews: 15,
    image: product3,
  },
  {
    id: 4,
    name: "White Choc Macadamia",
    price: "$14.49",
    rating: 5,
    reviews: 10,
    image: product4,
  },
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
