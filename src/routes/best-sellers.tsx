import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cookieCatalogOptions } from "@/lib/cookie-catalog";
import { CookieCatalogGrid } from "@/components/CookieCatalogGrid";
import { bestSellingCookieIds } from "@/lib/productos.functions";
export const Route = createFileRoute("/best-sellers")({
 head: () => ({ meta: [{title: "Más Vendidas — HAZOREX"}, {name:"description",content:"Galletas Hazorex por ventas cobradas."}, {property:"og:title",content:"Más Vendidas — HAZOREX"}, {property:"og:description",content:"Galletas Hazorex por ventas cobradas."}, {property:"og:type",content:"website"}, {name:"twitter:card",content:"summary_large_image"}] }),
 loader: async ({context}) => { await context.queryClient.ensureQueryData(cookieCatalogOptions); return { ranking: await bestSellingCookieIds() }; }, component: Page,
});
function Page(){
 const {data: products} = useSuspenseQuery(cookieCatalogOptions);
 const {ranking} = Route.useLoaderData();
 const order = new Map(ranking.map((id, i) => [id, i]));
 const list = [...products].sort((a,b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999) || a.id.localeCompare(b.id));
 return <main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-2xl font-bold">Más Vendidas</h1><CookieCatalogGrid products={list}/></main>;
}
