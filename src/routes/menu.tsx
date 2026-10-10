import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cookieCatalogOptions } from "@/lib/cookie-catalog";
import { CookieCatalogGrid } from "@/components/CookieCatalogGrid";
export const Route = createFileRoute("/menu")({
 head: () => ({ meta: [{title: "Galletas Hazorex — HAZOREX"}, {name:"description",content:"El catálogo de galletas Hazorex."}, {property:"og:title",content:"Galletas Hazorex — HAZOREX"}, {property:"og:description",content:"El catálogo de galletas Hazorex."}, {property:"og:type",content:"website"}, {name:"twitter:card",content:"summary_large_image"}] }),
 loader: async ({context}) => { await context.queryClient.ensureQueryData(cookieCatalogOptions); return {}; }, component: Page,
});
function Page(){
 const {data: products} = useSuspenseQuery(cookieCatalogOptions);
 const list = products;
 return <main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-2xl font-bold">Galletas Hazorex</h1><CookieCatalogGrid products={list}/></main>;
}
