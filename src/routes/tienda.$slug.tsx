import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Search, Store } from "lucide-react";
import { getPublicStore } from "@/lib/store-public.functions";
import { isStoreOpen, todayHoursLabel } from "@/lib/store";

export const Route = createFileRoute("/tienda/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicStore({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = (loaderData as any)?.store?.business_name ?? "Tienda";
    const desc =
      (loaderData as any)?.store?.descripcion ??
      `Compra en ${name} con entrega a domicilio por Hazorex.`;
    return {
      meta: [
        { title: `${name} — Tienda en Hazorex` },
        { name: "description", content: String(desc).slice(0, 155) },
        { property: "og:title", content: `${name} — Hazorex` },
        { property: "og:description", content: String(desc).slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: StorePage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Tienda no encontrada</div>
  ),
});

function StorePage() {
  const { t } = useTranslation();
  const { store, categories, products } = Route.useLoaderData() as any;
  const [q, setQ] = useState("");

  const open = isStoreOpen(store.horario);
  const hours = todayHoursLabel(store.horario);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = (products as any[]).filter(
      (p) => !term || String(p.nombre).toLowerCase().includes(term),
    );
    const byCat = new Map<string, any[]>();
    for (const p of filtered) {
      const key = p.category_id ?? "__none__";
      byCat.set(key, [...(byCat.get(key) ?? []), p]);
    }
    const sections = (categories as any[])
      .map((c) => ({ id: c.id, nombre: c.nombre, items: byCat.get(c.id) ?? [] }))
      .filter((s) => s.items.length > 0);
    const loose = byCat.get("__none__") ?? [];
    if (loose.length > 0) {
      sections.push({ id: "__none__", nombre: t("storePage.otherCategory"), items: loose });
    }
    return sections;
  }, [products, categories, q, t]);

  return (
    <main className="pb-16">
      <div className="relative h-40 w-full bg-muted sm:h-56">
        {store.bannerUrl && (
          <img src={store.bannerUrl} alt={store.business_name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.business_name}
              className="h-20 w-20 rounded-2xl border-4 border-background object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-background bg-muted">
              <Store className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="pb-2">
            <h1 className="font-serif text-2xl font-bold">{store.business_name}</h1>
            <p className="text-xs text-muted-foreground">
              {(store.zonas_que_atiende?.join(" · ") || store.city) ?? ""}
              {hours ? ` · ${hours}` : ""}
            </p>
          </div>
        </div>

        {store.descripcion && (
          <p className="mt-4 text-sm text-muted-foreground">{store.descripcion}</p>
        )}

        {!open && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <Clock className="h-4 w-4 shrink-0" />
            {t("storePage.closedNotice")}
          </div>
        )}

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("storePage.searchPlaceholder")}
            className="w-full rounded-lg border border-border py-3 pl-10 pr-3 text-sm"
          />
        </div>

        {grouped.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("storePage.noProducts")}</p>
        ) : (
          grouped.map((section: any) => (
            <section key={section.id} className="mt-8">
              <h2 className="mb-3 text-lg font-bold">{section.nombre}</h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((p: any) => (
                  <li
                    key={p.id}
                    className={`rounded-xl border border-border bg-card p-3 ${
                      p.disponible ? "" : "opacity-50 grayscale"
                    }`}
                  >
                    <div className="relative">
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre}
                          loading="lazy"
                          className="h-28 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-28 w-full rounded-lg bg-muted" />
                      )}
                      {!p.disponible && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {t("storePage.soldOut")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-semibold">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(p.precio).toFixed(2)} / {p.unidad}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
