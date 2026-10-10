import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cookieCatalogOptions } from "@/lib/cookie-catalog";
import { CookieCatalogGrid } from "@/components/CookieCatalogGrid";
import { z } from "zod";
import { useState } from "react";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/search")({
 validateSearch: (raw) => z.object({ q: z.string().max(200).catch("").default("") }).parse(raw),
 head: () => ({ meta: [{title: "Buscar galletas — HAZOREX"}, {name:"description",content:"Encuentra tus galletas Hazorex."}, {property:"og:title",content:"Buscar galletas — HAZOREX"}, {property:"og:description",content:"Encuentra tus galletas Hazorex."}, {property:"og:type",content:"website"}, {name:"twitter:card",content:"summary_large_image"}] }),
 loader: async ({context}) => { await context.queryClient.ensureQueryData(cookieCatalogOptions); return {}; }, component: Page,
});
function Page(){
 const {data: products} = useSuspenseQuery(cookieCatalogOptions);
 const {q} = Route.useSearch();
 const [term,setTerm] = useState(q);
 const list = products.filter(p => `${p.nombre} ${p.descripcion ?? ""}`.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
 return <main className="mx-auto max-w-6xl px-4 py-8"><h1 className="mb-6 text-2xl font-bold">Buscar galletas</h1><Input aria-label="Buscar galletas" value={term} maxLength={200} onChange={e => setTerm(e.target.value)} className="mb-6" /><CookieCatalogGrid products={list}/></main>;
}
