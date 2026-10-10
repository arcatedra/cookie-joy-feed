import { useCart } from "@/lib/cart";
import { type Producto } from "@/lib/productos.functions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
export function CookieCatalogGrid({ products }: { products: Producto[] }) {
  const cart = useCart();
  const { t } = useTranslation();
  return <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
    <div className="aspect-square bg-muted">{p.imagen_url && <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="h-full w-full object-cover" />}</div>
    <div className="flex flex-col gap-3 p-3"><h2 className="min-h-10 text-sm font-semibold">{p.nombre}</h2><p className="font-bold">${Number(p.precio).toFixed(2)}</p>
    <Button size="sm" onClick={() => cart.add({ id: p.id, name: p.nombre, price: Number(p.precio), image: p.imagen_url ?? "" })}><Plus className="h-4 w-4" />{t("common.addToCart", "Agregar al carrito")}</Button></div>
  </li>)}</ul>;
}