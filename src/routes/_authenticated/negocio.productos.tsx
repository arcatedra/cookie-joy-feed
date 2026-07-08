import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import {
  fetchMyBusiness,
  fetchBusinessProducts,
  upsertProduct,
  deleteProduct,
  type BusinessProduct,
} from "@/lib/businesses";

export const Route = createFileRoute("/_authenticated/negocio/productos")({
  head: () => ({
    meta: [
      { title: "Productos — Mi negocio Hazorex" },
      { name: "description", content: "Administra el catálogo de tu negocio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

function ProductsPage() {
  const qc = useQueryClient();
  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ["my-business"],
    queryFn: fetchMyBusiness,
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ["business-products", business?.id],
    queryFn: () => (business ? fetchBusinessProducts(business.id) : Promise.resolve([])),
    enabled: !!business && business.status === "aprobado",
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);

  if (loadingBiz) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
        <div className="mx-auto max-w-xl p-6 text-center text-sm">
          No tienes un negocio registrado.{" "}
          <Link to="/negocios/registro" className="font-semibold text-[#1e3a5f] underline">
            Postúlate
          </Link>
        </div>
      </div>
    );
  }

  if (business.status !== "aprobado") {
    return (
      <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
        <div className="mx-auto max-w-xl p-6 text-center text-sm">
          Solo puedes administrar productos cuando tu negocio esté aprobado.{" "}
          <Link to="/negocio" className="font-semibold text-[#1e3a5f] underline">
            Ver estado
          </Link>
        </div>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      await upsertProduct(business!.id, {
        name: name.trim(),
        price: Number(price),
        category: category.trim() || null,
        description: description.trim() || null,
        stock_quantity: Number(stock) || 0,
        is_active: true,
      });
      toast.success("Producto agregado");
      setName("");
      setPrice("");
      setCategory("");
      setDescription("");
      setStock("0");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["business-products", business!.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteProduct(id);
      qc.invalidateQueries({ queryKey: ["business-products", business!.id] });
      toast.success("Eliminado");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  async function toggleActive(p: BusinessProduct) {
    try {
      await upsertProduct(business!.id, { id: p.id, name: p.name, price: p.price, is_active: !p.is_active });
      qc.invalidateQueries({ queryKey: ["business-products", business!.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/negocio"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#4a3525] hover:text-[#1e3a5f]"
        >
          <ArrowLeft className="h-4 w-4" /> Mi negocio
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">Productos</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-md min-h-11 bg-[#1e3a5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#16294a]"
          >
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAdd}
            className="mb-6 space-y-3 rounded-md border border-border bg-card p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Precio (USD)"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Categoría"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <textarea
              placeholder="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={2}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md min-h-11 bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16294a] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </button>
          </form>
        )}

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !products || products.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aún no has agregado productos.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.category ?? "Sin categoría"} · Stock: {p.stock_quantity}
                </div>
              </div>
              <div className="text-sm font-bold">USD {p.price.toFixed(2)}</div>
              <button
                onClick={() => toggleActive(p)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  p.is_active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.is_active ? "Activo" : "Oculto"}
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
