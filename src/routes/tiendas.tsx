import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search, Store } from "lucide-react";
import { listPublicStores } from "@/lib/store-public.functions";
import { LoadErrorState } from "@/components/LoadErrorState";
import { BUSINESS_TYPE_LABELS, type BusinessType } from "@/lib/businesses";
import { NYC_DELIVERY_ZONES } from "@/lib/nyc-zones";

export const Route = createFileRoute("/tiendas")({
  head: () => ({
    meta: [
      { title: "Tiendas y supermercados cerca de ti — Hazorex" },
      {
        name: "description",
        content:
          "Explora supermercados, tiendas, panaderías y farmacias que entregan en tu zona con Hazorex.",
      },
      { property: "og:title", content: "Tiendas y supermercados — Hazorex" },
      {
        property: "og:description",
        content: "Descubre las tiendas locales que entregan en tu zona con Hazorex.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoresPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const TYPES: BusinessType[] = ["supermercado", "tienda", "panaderia", "farmacia", "otro"];

function StoresPage() {
  const { t } = useTranslation();
  const fetchStores = useServerFn(listPublicStores);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => fetchStores(),
    retry: false,
    staleTime: 60_000,
  });

  const [q, setQ] = useState("");
  const [zone, setZone] = useState<string>("");
  const [type, setType] = useState<string>("");

  const list = useMemo(() => {
    const all = (data ?? []) as any[];
    const term = q.trim().toLowerCase();
    return all.filter((s) => {
      if (term && !String(s.business_name).toLowerCase().includes(term)) return false;
      if (type && s.business_type !== type) return false;
      if (zone) {
        const zones: string[] = s.zonas_que_atiende ?? [];
        if (!zones.includes(zone) && s.city !== zone) return false;
      }
      return true;
    });
  }, [data, q, zone, type]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-serif text-3xl font-bold">{t("stores.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("stores.subtitle")}</p>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("stores.searchPlaceholder")}
            className="w-full rounded-lg border border-border py-3 pl-10 pr-3 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("stores.allZones")}</option>
            {NYC_DELIVERY_ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">{t("stores.allTypes")}</option>
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {BUSINESS_TYPE_LABELS[ty]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <LoadErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("stores.empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to="/tienda/$slug"
                params={{ slug: s.slug }}
                className="flex h-full items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:shadow-md"
              >
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt={s.business_name} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-lg bg-muted">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.business_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {BUSINESS_TYPE_LABELS[s.business_type as BusinessType]}
                    {(s.zonas_que_atiende?.[0] ?? s.city) ? ` · ${s.zonas_que_atiende?.[0] ?? s.city}` : ""}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
