import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingBasket } from "lucide-react";
import { getPublicStore } from "@/lib/store-public.functions";
import { getHouseBestSellers } from "@/lib/house-store.functions";
import { HOUSE_STORE_SLUG, HOUSE_CATEGORIES, discountPct } from "@/lib/house-store-rules";
import { StoreCartBar, storeCartKey } from "./tienda.$slug";
import { ProductPhotoCredit } from "@/components/ProductPhotoCredit";
import { Button } from "@/components/ui/button";
import { SpecialOrderForm } from "@/components/SpecialOrderForm";
import { specialCartKey, type SpecialItem } from "@/lib/special-order-rules";
import { houseSubcategories, productDescription } from "@/lib/house-store-rules";

export const Route = createFileRoute("/supermercado")({
  loader: async () => {
    const data = await getPublicStore({ data: { slug: HOUSE_STORE_SLUG } });
    if (!data) throw notFound();
    return data;
  },
  head: () => ({
    meta: [
      { title: "Supermercado — Hazorex" },
      { name: "description", content: "Frutas, verduras, bebidas y más del súper, entregados a tu puerta por Hazorex. Paga según el peso de tu pedido." },
      { property: "og:title", content: "Supermercado Hazorex" },
      { property: "og:description", content: "Haz tu compra del súper en Hazorex y recíbela en casa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupermarketPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-10 text-center text-sm text-muted-foreground">Supermercado no disponible</div>,
});

type P = any;

function SupermarketPage() {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const L = (es: string, e: string) => (en ? e : es);
  const { store, categories, products } = Route.useLoaderData() as any;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [subcat, setSubcat] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [especiales, setEspeciales] = useState<SpecialItem[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: best = [] } = useQuery({ queryKey: ["house-best"], queryFn: () => getHouseBestSellers(), staleTime: 300_000 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeCartKey(store.id));
      if (raw) setCart(JSON.parse(raw));
      const sp = localStorage.getItem(specialCartKey(store.id));
      if (sp) setEspeciales(JSON.parse(sp));
    } catch {}
    setLoaded(true);
  }, [store.id]);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (Object.keys(cart).length) localStorage.setItem(storeCartKey(store.id), JSON.stringify(cart));
      else localStorage.removeItem(storeCartKey(store.id));
      if (especiales.length) localStorage.setItem(specialCartKey(store.id), JSON.stringify(especiales));
      else localStorage.removeItem(specialCartKey(store.id));
    } catch {}
  }, [cart, especiales, loaded, store.id]);

  const add = (id: string, d: number) =>
    setCart((prev) => {
      const n = Math.max(0, (prev[id] ?? 0) + d);
      const c = { ...prev };
      if (n === 0) delete c[id];
      else c[id] = n;
      return c;
    });

  const visible = (products as P[]).filter((p) => p.disponible !== false);
  const catName = useMemo(() => new Map((categories as any[]).map((c) => [c.id, c.nombre as string])), [categories]);
  const name = (p: P) => (en && p.nombre_en ? p.nombre_en : p.nombre);

  const term = q.trim().toLowerCase();
  const results = term
     ? visible.filter((p) => (!cat || catName.get(p.category_id) === cat) && (!subcat || p.subcategoria === subcat) && `${p.nombre} ${p.nombre_en ?? ""}`.toLowerCase().includes(term))
    : null;

  const offers = visible.filter((p) => discountPct(Number(p.precio), Number(p.precio_anterior)) > 0);
  const bestList = best.map((id) => visible.find((p) => p.id === id)).filter(Boolean) as P[];
  const rows = HOUSE_CATEGORIES.map((c) => ({
    ...c,
     items: visible.filter((p) => catName.get(p.category_id) === c.es && (!subcat || p.subcategoria === subcat)),
  })).filter((r) => r.items.length > 0 && (!cat || cat === r.es));

   const card = (p: P) => <ProductCard key={p.id} p={p} name={name(p)} description={productDescription(p, en)} qty={cart[p.id] ?? 0} onAdd={add} L={L} />;

  return (
    <main className="mx-auto max-w-6xl pb-24">
      <header className="px-4 pt-5">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{L("Supermercado", "Supermarket")}</h1>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">
          {L("Precios de supermercado de tu zona, sin recargo en los productos", "Local supermarket prices, no markup on products")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {L("Lo compramos por ti en el súper y te lo llevamos. La entrega depende del peso.", "We shop at the supermarket for you and deliver it. Delivery is priced by weight.")}
        </p>
        <label className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L("Buscar productos", "Search products")}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
      </header>

      <nav className="sticky top-0 z-30 mt-3 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
         <Button variant="ghost" onClick={() => { setCat(null); setSubcat(null); }} className={chip(!cat)}>{L("Todo", "All")}</Button>
        {HOUSE_CATEGORIES.map((c) => (
           <Button variant="ghost" key={c.es} onClick={() => { setCat(cat === c.es ? null : c.es); setSubcat(null); }} className={chip(cat === c.es)}>
            {en ? c.en : c.es}
           </Button>
        ))}
      </nav>
      {houseSubcategories(cat).length > 0 && <nav aria-label={L("Subcategorías", "Subcategories")} className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
        <Button variant="ghost" onClick={() => setSubcat(null)} className={chip(!subcat)}>{L("Todo", "All")}</Button>
        {houseSubcategories(cat).map((c) => <Button variant="ghost" key={c.es} onClick={() => setSubcat(c.es)} className={chip(subcat === c.es)}>{en ? c.en : c.es}</Button>)}
      </nav>}

      <SpecialOrderForm items={especiales} onChange={setEspeciales} L={L} />

      {results ? (
        <section className="px-4 pt-4">
          <h2 className="mb-3 text-lg font-bold">{L("Resultados", "Results")} ({results.length})</h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{L("No encontramos ese producto.", "No products found.")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{results.map(card)}</div>
          )}
        </section>
      ) : (
        <>
          {!cat && offers.length > 0 && <Row title={L("Ofertas", "Deals")}>{offers.map(card)}</Row>}
          {!cat && bestList.length > 0 && <Row title={L("Más vendidos", "Best sellers")}>{bestList.map(card)}</Row>}
          {rows.map((r) => (
             houseSubcategories(r.es).length > 0 && cat === r.es ? <section key={r.es} className="px-4 pt-5">
               <h2 className="mb-3 text-lg font-bold">{subcat ? L(subcat, houseSubcategories(r.es).find((c) => c.es === subcat)?.en ?? subcat) : L(r.es, r.en)}</h2>
               <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{r.items.map(card)}</div>
             </section> : <Row key={r.es} title={en ? r.en : r.es} refCb={(el) => (sectionRefs.current[r.es] = el)}>{r.items.map(card)}</Row>
          ))}
          {rows.length === 0 && (
            <p className="px-4 pt-6 text-sm text-muted-foreground">
              {L("Pronto habrá productos en esta categoría.", "Products coming soon in this category.")}
            </p>
          )}
        </>
      )}

      <footer className="px-4 pt-8 text-xs text-muted-foreground">
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Foto: Open Food Facts</a>
        {" ("}<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY-SA</a>{")"}
        {products.some((p: P) => p.foto_fondo_editado === true) ? ", fondo editado" : null}
      </footer>
      <StoreCartBar compact businessId={store.id} products={products} cart={cart} especiales={especiales} onClear={() => { setCart({}); setEspeciales([]); }} />
    </main>
  );
}

const chip = (on: boolean) =>
  `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"}`;

function Row({ title, children, refCb }: { title: string; children: React.ReactNode; refCb?: (el: HTMLElement | null) => void }) {
  return (
    <section ref={refCb} className="pt-5">
      <h2 className="px-4 text-lg font-bold">{title}</h2>
      <div className="mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [&>*]:w-40 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-44">
        {children}
      </div>
    </section>
  );
}

function ProductCard({ p, name, description, qty, onAdd, L }: { p: P; name: string; description: string; qty: number; onAdd: (id: string, d: number) => void; L: (a: string, b: string) => string }) {
  const price = Number(p.precio);
  const prev = Number(p.precio_anterior) || null;
  const off = discountPct(price, prev);
  const perLb = !!p.vendido_por_lb;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        {p.imagenUrl ? (
          <img src={p.imagenUrl} alt={name} loading="lazy" width={300} height={300} className={`h-full w-full ${p.foto_credito ? "object-contain" : "object-cover"}`} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ShoppingBasket className="h-8 w-8" /></div>
        )}
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">-{off}%</span>
        )}
        <div className="absolute bottom-2 right-2">
          {qty === 0 ? (
            <button
              onClick={() => onAdd(p.id, 1)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow"
            >
              <Plus className="h-4 w-4" /> {L("Agregar", "Add")}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary px-2 py-1 text-primary-foreground shadow">
              <button aria-label={L("Quitar", "Remove")} onClick={() => onAdd(p.id, -1)}><Minus className="h-4 w-4" /></button>
              <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
              <button aria-label={L("Agregar", "Add")} onClick={() => onAdd(p.id, 1)}><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-extrabold">${price.toFixed(2)}{perLb ? <span className="text-xs font-medium">/lb</span> : null}</span>
        {off > 0 && prev && <span className="text-xs text-muted-foreground line-through">${prev.toFixed(2)}</span>}
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-tight">{name}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {p.tamano && <p className="text-xs text-muted-foreground">{p.tamano}</p>}
      <ProductPhotoCredit product={p} />
      {perLb && (
        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
          {L(
            `Precio estimado ~$${(price * Number(p.peso_lb || 1)).toFixed(2)}. El total final se ajusta al peso real.`,
            `Estimated price ~$${(price * Number(p.peso_lb || 1)).toFixed(2)}. Final total adjusts to actual weight.`,
          )}
        </p>
      )}
    </article>
  );
}

