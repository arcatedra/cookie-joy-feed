import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, ShoppingCart, Package } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSubscriptionGate } from "@/lib/subscription-gate";

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

interface Cookie {
  id: string;
  nameKey: string;
  image: string;
}

const COOKIES: Cookie[] = [
  { id: "c1", nameKey: "cookies.c1.name", image: imgChocChunk },
  { id: "c2", nameKey: "cookies.c2.name", image: imgSnicker },
  { id: "c3", nameKey: "cookies.c3.name", image: imgSugar },
  { id: "c4", nameKey: "cookies.c4.name", image: imgDoubleChoc },
  { id: "c5", nameKey: "cookies.c5.name", image: imgOatmeal },
  { id: "c6", nameKey: "cookies.c6.name", image: imgWhiteMac },
  { id: "c7", nameKey: "cookies.c7.name", image: imgMM },
  { id: "c8", nameKey: "cookies.c8.name", image: imgPB },
  { id: "c9", nameKey: "cookies.c9.name", image: imgVeganChoc },
  { id: "c10", nameKey: "cookies.c10.name", image: imgMint },
];

const SIZES = [
  { count: 6, price: 22 },
  { count: 9, price: 32 },
  { count: 12, price: 42 },
] as const;

export const Route = createFileRoute("/build-pack")({
  head: () => ({
    meta: [
      { title: i18n.t("buildPackPage.metaTitle", "Crea tu Pack — HAZOREX") },
      { name: "description", content: i18n.t("buildPackPage.metaDesc", "Arma tu propia caja de galletas HAZOREX eligiendo cada sabor.") },
      { property: "og:title", content: i18n.t("buildPackPage.metaTitle", "Crea tu Pack — HAZOREX") },
      { property: "og:description", content: i18n.t("buildPackPage.metaDesc", "Arma tu propia caja de galletas HAZOREX eligiendo cada sabor.") },
    ],
  }),
  component: BuildPackPage,
});

function BuildPackPage() {
  const { t } = useTranslation();
  const cart = useCart();
  const gate = useSubscriptionGate();
  

  const [sizeIdx, setSizeIdx] = useState(0);
  const size = SIZES[sizeIdx];
  const [selection, setSelection] = useState<Record<string, number>>({});

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((s, n) => s + n, 0),
    [selection],
  );
  const remaining = size.count - totalSelected;

  const changeSize = (i: number) => {
    setSizeIdx(i);
    setSelection({});
  };

  const inc = (id: string) => {
    if (remaining <= 0) return;
    setSelection((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };
  const dec = (id: string) => {
    setSelection((prev) => {
      const next = { ...prev };
      const cur = next[id] ?? 0;
      if (cur <= 1) delete next[id];
      else next[id] = cur - 1;
      return next;
    });
  };

  const addToCart = () => {
    if (remaining !== 0) return;
    if (!gate.guard()) return;
    const parts = Object.entries(selection)
      .map(([id, qty]) => `${qty}× ${t(COOKIES.find((c) => c.id === id)!.nameKey)}`)
      .join(", ");
    const name = t("buildPackPage.cartName", "Pack personalizado ({{count}} galletas)", { count: size.count });
    cart.add({
      id: `custom-pack-${size.count}-${Date.now()}`,
      name: `${name} — ${parts}`,
      price: size.price,
      image: imgPack6,
    });
    setSelection({});
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-500 text-white">
          <Package className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1a0f0a] md:text-3xl">
            {t("buildPackPage.title", "Crea tu Pack")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("buildPackPage.subtitle", "Elige el tamaño y selecciona tus sabores favoritos para armar tu caja personalizada.")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#1a0f0a]">
              {t("buildPackPage.chooseSize", "Tamaño:")}
            </span>
            {SIZES.map((s, i) => (
              <button
                key={s.count}
                type="button"
                onClick={() => changeSize(i)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                  sizeIdx === i
                    ? "border-amber-500 bg-amber-400 text-[#1a0f0a]"
                    : "border-border bg-white text-foreground hover:border-amber-400"
                }`}
              >
                {s.count} · ${s.price}
              </button>
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COOKIES.map((c) => {
              const qty = selection[c.id] ?? 0;
              const name = t(c.nameKey);
              return (
                <li key={c.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-white">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img src={c.image} alt={name} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2.5">
                    <p className="line-clamp-2 text-xs font-semibold text-[#1a0f0a]">{name}</p>
                    <div className="mt-auto flex items-center justify-between rounded-full bg-muted px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => dec(c.id)}
                        disabled={qty === 0}
                        className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#1a0f0a] shadow-sm transition disabled:opacity-40"
                        aria-label={t("buildPackPage.decrease", "Quitar")}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold tabular-nums">{qty}</span>
                      <button
                        type="button"
                        onClick={() => inc(c.id)}
                        disabled={remaining <= 0}
                        className="grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[#1a0f0a] shadow-sm transition disabled:opacity-40"
                        aria-label={t("buildPackPage.increase", "Agregar")}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <h2 className="text-base font-extrabold text-[#1a0f0a]">
              {t("buildPackPage.summary", "Tu pack")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("buildPackPage.progress", "{{selected}} de {{total}} galletas seleccionadas", {
                selected: totalSelected,
                total: size.count,
              })}
            </p>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(totalSelected / size.count) * 100}%` }}
              />
            </div>

            <ul className="mt-3 space-y-1 text-xs">
              {Object.entries(selection).length === 0 ? (
                <li className="italic text-muted-foreground">
                  {t("buildPackPage.emptyList", "Aún no has elegido sabores.")}
                </li>
              ) : (
                Object.entries(selection).map(([id, qty]) => (
                  <li key={id} className="flex justify-between">
                    <span>{t(COOKIES.find((c) => c.id === id)!.nameKey)}</span>
                    <span className="font-semibold">×{qty}</span>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">{t("buildPackPage.total", "Total")}</span>
              <span className="text-xl font-extrabold text-[#1a0f0a]">${size.price.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={addToCart}
              disabled={remaining !== 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#1a0f0a] shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              {remaining === 0
                ? t("buildPackPage.addToCart", "Agregar pack al carrito")
                : t("buildPackPage.selectMore", "Elige {{n}} más", { n: remaining })}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
