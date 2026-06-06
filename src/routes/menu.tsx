import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Search, ThumbsUp, ShoppingCart, Menu as MenuIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
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

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Oys" },
      { name: "description", content: "Browse our classic cookies." },
    ],
  }),
  component: MenuPage,
});

interface MenuItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  description: string;
  image: string;
  badge?: "V" | "GF";
  tag?: "TREE NUTS" | "PEANUTS";
}

const cookies: MenuItem[] = [
  { id: "c1", name: "Chocolate Chunk", price: 3.75, rating: 89, reviews: 272, description: "A rich, buttery vanilla cookie amped up with semi-sweet chocolate chunks.", image: imgChocChunk },
  { id: "c2", name: "Snickerdoodle", price: 3.75, rating: 91, reviews: 125, description: "Stick to a classic with our Snickerdoodle. A warm, soft cookie rolled in cinnamon sugar.", image: imgSnicker },
  { id: "c3", name: "Sugar", price: 3.75, rating: 85, reviews: 134, description: "Simply the best melt-in-your-mouth, buttery sugar cookie you've ever tasted.", image: imgSugar },
  { id: "c4", name: "Double Chocolate Chunk", price: 3.75, rating: 87, reviews: 197, description: "Our dark chocolate cookie packed with rich chocolate chunks. For true chocolate lovers.", image: imgDoubleChoc },
  { id: "c5", name: "Oatmeal Raisin", price: 3.75, rating: 88, reviews: 98, description: "A treat that's like a hug for the soul. Warm oats and plump raisins in every bite.", image: imgOatmeal },
  { id: "c6", name: "White Chocolate Macadamia", price: 3.75, rating: 81, reviews: 95, description: "This snack operates on island time. A coconut-buttery cookie with white chocolate and macadamia nuts.", image: imgWhiteMac, tag: "TREE NUTS" },
  { id: "c7", name: "Classic with M&M'S®", price: 3.75, rating: 82, reviews: 79, description: "This colorful candy-coated twist on our classic chocolate chip is a sweet surprise.", image: imgMM },
  { id: "c8", name: "Peanut Butter Chip", price: 3.75, rating: 83, reviews: 56, description: "Peanut butter chips folded into a soft, sweet vanilla cookie. Nutty heaven.", image: imgPB, tag: "PEANUTS" },
  { id: "c9", name: "Vegan Chocolate Chunk", price: 3.75, rating: 83, reviews: 37, description: "A vegan cookie that warms your soul with loads of dairy-free chocolate chunks.", image: imgVeganChoc, badge: "V" },
  { id: "c10", name: "Double Chocolate Mint", price: 3.75, rating: 95, reviews: 23, description: "Our take on a favorite flavor combo. A warm chocolate cookie with cool mint chips.", image: imgMint, badge: "V" },
];

interface PackItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
}

const packs: PackItem[] = [
  { id: "p6", name: "6-Pack", price: 20.00, description: "Treat yourself to 6 warm, delicious treats in one box.", image: imgPack6 },
  { id: "p9", name: "9-Pack", price: 28.00, description: "The sweet spot of satisfaction. Select 9 of your favorite cookies.", image: imgPack9 },
  { id: "p12", name: "12-Pack", price: 36.00, description: "What they REALLY mean when they say to bring enough for everyone.", image: imgPack12 },
];

const tabs = ["Classic Cookies", "Packs", "Deluxe Cookies"] as const;

function useSnapCarousel(itemCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const el = ref.current;
    if (!el) return;
    const scrollWidth = el.scrollWidth;
    const itemWidth = scrollWidth / itemCount;
    el.scrollTo({ left: itemWidth * index, behavior: "smooth" });
  }, [itemCount]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollWidth = el.scrollWidth - el.clientWidth;
      if (scrollWidth <= 0) return;
      const progress = el.scrollLeft / scrollWidth;
      const idx = Math.min(itemCount - 1, Math.max(0, Math.round(progress * (itemCount - 1))));
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [itemCount]);

  return { ref, activeIndex, scrollTo };
}

function MenuPage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Classic Cookies");
  const [selectedCookie, setSelectedCookie] = useState<MenuItem | null>(null);

  const { ref: packsRef, activeIndex: packIndex, scrollTo: scrollToPack } = useSnapCarousel(packs.length);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = cookies.reduce((sum, c) => sum + (cart[c.id] ?? 0) * c.price, 0)
    + packs.reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.price, 0);

  const add = (id: string) => setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((p) => {
      const n = (p[id] ?? 0) - 1;
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const detailQty = selectedCookie ? (cart[selectedCookie.id] ?? 0) : 0;

  return (
    <main className="min-h-screen bg-white pb-32 font-sans text-black">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link to="/" aria-label="Back" className="grid h-10 w-10 place-items-center">
          <ChevronLeft className="h-6 w-6 text-black" strokeWidth={2.5} />
        </Link>
        <h1 className="text-[19px] font-bold text-black">Insomnia Cookies</h1>
        <button aria-label="Search" className="grid h-10 w-10 place-items-center">
          <Search className="h-5 w-5 text-black" strokeWidth={2.5} />
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-6 border-b border-gray-200 px-4">
        <button aria-label="All categories" className="pb-3 pt-1">
          <MenuIcon className="h-5 w-5 text-black" strokeWidth={2.5} />
        </button>
        {tabs.map((t) => {
          const active = t === activeTab;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`relative whitespace-nowrap pb-3 pt-1 text-[15px] ${active ? "font-bold text-black" : "font-medium text-gray-400"}`}
            >
              {t}
              {active && <span className="absolute -bottom-px left-0 right-0 h-[3px] bg-black" />}
            </button>
          );
        })}
      </nav>

      {/* Grid */}
      {activeTab === "Classic Cookies" && (
        <section className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-5">
          {cookies.map((item) => {
            const qty = cart[item.id] ?? 0;
            return (
              <article key={item.id} className="flex flex-col">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f6f6f6]">
                  <button
                    type="button"
                    aria-label={`View ${item.name} details`}
                    onClick={() => setSelectedCookie(item)}
                    className="absolute inset-0 cursor-pointer text-left"
                  >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={1024}
                    height={1024}
                  />
                  {item.badge && (
                    <span
                      className={`absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold text-white ${item.badge === "V" ? "bg-[#0a8a3a]" : "bg-[#0a8a3a]"}`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.tag && (
                    <span className="absolute right-2 top-2 rounded-full bg-[#6b2c91] px-2 py-1 text-[9px] font-extrabold tracking-wide text-white">
                      {item.tag}
                    </span>
                  )}
                  </button>
                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); add(item.id); }}
                      aria-label={`Add ${item.name}`}
                      className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md ring-1 ring-black/5"
                    >
                      <Plus className="h-5 w-5 text-black" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-md ring-1 ring-black/5"
                    >
                      <button type="button" onClick={() => sub(item.id)} aria-label="Remove" className="grid h-6 w-6 place-items-center">
                        <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[14px] text-center text-sm font-bold text-black">{qty}</span>
                      <button type="button" onClick={() => add(item.id)} aria-label="Add" className="grid h-6 w-6 place-items-center">
                        <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="mt-2.5 text-[17px] font-bold leading-tight text-black">{item.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-[14px] text-black">
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                  <span className="text-gray-400">•</span>
                  <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="font-medium">{item.rating}%</span>
                  <span className="text-gray-500">({item.reviews})</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-gray-500">
                  {item.description}
                </p>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "Packs" && (
        <section className="relative pt-5">
          <button
            type="button"
            onClick={() => scrollToPack(Math.max(0, packIndex - 1))}
            aria-label="Previous pack"
            className={`absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm transition-opacity ${packIndex === 0 ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>

          <div
            ref={packsRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {packs.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <article
                  key={item.id}
                  className="mr-4 w-[82vw] max-w-[340px] flex-shrink-0 snap-center rounded-2xl bg-[#f6f6f6] p-3 last:mr-4"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={1024}
                      height={1024}
                    />
                  </div>
                  <div className="mt-3 flex flex-col">
                    <h3 className="text-[18px] font-bold leading-tight text-black">{item.name}</h3>
                    <p className="mt-1 text-[15px] font-bold text-black">${item.price.toFixed(2)}</p>
                    <p className="mt-1.5 text-[14px] leading-snug text-gray-500">{item.description}</p>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => add(item.id)}
                        aria-label={`Add ${item.name}`}
                        className="mt-4 w-full rounded-full bg-black py-3 text-center text-[14px] font-bold text-white shadow-md active:scale-[0.98] transition-transform"
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center justify-between rounded-full bg-white px-2 py-2 shadow-sm ring-1 ring-black/5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => sub(item.id)} aria-label="Remove" className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 active:scale-90 transition-transform">
                            <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[24px] text-center text-sm font-bold text-black">{qty}</span>
                          <button type="button" onClick={() => add(item.id)} aria-label="Add" className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 active:scale-90 transition-transform">
                            <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                          </button>
                        </div>
                        <span className="pr-3 text-sm font-bold text-black">${(qty * item.price).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollToPack(Math.min(packs.length - 1, packIndex + 1))}
            aria-label="Next pack"
            className={`absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm transition-opacity ${packIndex === packs.length - 1 ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 pb-2">
            {packs.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPack(i)}
                aria-label={`Go to pack ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-all ${i === packIndex ? "w-5 bg-black" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </section>
      )}

      {activeTab === "Deluxe Cookies" && (
        <section className="flex flex-col items-center justify-center px-4 pt-16 text-center">
          <p className="text-[17px] font-medium text-gray-400">Coming soon</p>
        </section>
      )}

      {/* Floating cart */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <button className="flex items-center gap-3 rounded-full bg-black px-6 py-3.5 text-white shadow-2xl">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-[15px] font-bold">
              View cart • {cartCount}
            </span>
            <span className="text-[15px] font-bold text-white/80">
              ${cartTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      <BottomNav />

      {/* Cookie Detail Modal */}
      <Dialog open={!!selectedCookie} onOpenChange={(open) => !open && setSelectedCookie(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{selectedCookie?.name}</DialogTitle>
          <DialogDescription className="sr-only">Detalle de {selectedCookie?.name}</DialogDescription>
          {selectedCookie && (
            <div className="flex flex-col">
              {/* Large image */}
              <div className="relative aspect-square bg-[#f6f6f6]">
                <img
                  src={selectedCookie.image}
                  alt={selectedCookie.name}
                  className="h-full w-full object-cover"
                  width={1024}
                  height={1024}
                />
                {selectedCookie.badge && (
                  <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#0a8a3a] text-xs font-extrabold text-white">
                    {selectedCookie.badge}
                  </span>
                )}
                {selectedCookie.tag && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#6b2c91] px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide text-white">
                    {selectedCookie.tag}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="px-5 pb-6 pt-4">
                <h2 className="text-[22px] font-bold leading-tight text-black">
                  {selectedCookie.name}
                </h2>
                <div className="mt-1.5 flex items-center gap-2 text-[15px] text-black">
                  <span className="font-bold">${selectedCookie.price.toFixed(2)}</span>
                  <span className="text-gray-300">|</span>
                  <ThumbsUp className="h-4 w-4" strokeWidth={2.5} />
                  <span className="font-medium">{selectedCookie.rating}%</span>
                  <span className="text-gray-500">({selectedCookie.reviews} reviews)</span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                  {selectedCookie.description}
                </p>

                {/* Quantity & Add to cart */}
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5">
                    <button
                      onClick={() => sub(selectedCookie.id)}
                      disabled={detailQty === 0}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[28px] text-center text-base font-bold text-black">{detailQty}</span>
                    <button
                      onClick={() => add(selectedCookie.id)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm"
                    >
                      <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                    </button>
                  </div>
                  <button
                    onClick={() => add(selectedCookie.id)}
                    className="flex-1 rounded-full bg-black py-3.5 text-center text-[16px] font-bold text-white shadow-lg"
                  >
                    {detailQty === 0 ? "Add to Cart" : `Update Cart • $${(detailQty * selectedCookie.price).toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
