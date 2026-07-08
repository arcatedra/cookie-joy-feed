import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import {
  fetchMyBusiness,
  fetchBusinessOffers,
  fetchBusinessProducts,
  upsertOffer,
  deleteOffer,
  type DiscountType,
} from "@/lib/businesses";

export const Route = createFileRoute("/_authenticated/negocio/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas — Mi negocio Hazorex" },
      { name: "description", content: "Crea descuentos y promociones para tus productos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OffersPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

function OffersPage() {
  const qc = useQueryClient();
  const { data: business, isLoading: loadingBiz } = useQuery({
    queryKey: ["my-business"],
    queryFn: fetchMyBusiness,
  });
  const enabled = !!business && business.status === "aprobado";
  const { data: offers, isLoading } = useQuery({
    queryKey: ["business-offers", business?.id],
    queryFn: () => (business ? fetchBusinessOffers(business.id) : Promise.resolve([])),
    enabled,
  });
  const { data: products } = useQuery({
    queryKey: ["business-products", business?.id],
    queryFn: () => (business ? fetchBusinessProducts(business.id) : Promise.resolve([])),
    enabled,
  });

  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("porcentaje");
  const [discountValue, setDiscountValue] = useState("");
  const [endsAt, setEndsAt] = useState("");
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

  if (!business || business.status !== "aprobado") {
    return (
      <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
        <div className="mx-auto max-w-xl p-6 text-center text-sm">
          Solo puedes crear ofertas con un negocio aprobado.{" "}
          <Link to="/negocio" className="font-semibold text-[#1e3a5f] underline">
            Ver estado
          </Link>
        </div>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!discountValue) return;
    setSaving(true);
    try {
      await upsertOffer(business!.id, {
        product_id: productId || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: true,
      });
      toast.success("Oferta creada");
      setProductId("");
      setDiscountValue("");
      setEndsAt("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["business-offers", business!.id] });
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta oferta?")) return;
    try {
      await deleteOffer(id);
      qc.invalidateQueries({ queryKey: ["business-offers", business!.id] });
      toast.success("Eliminada");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  const productName = (id: string | null) => {
    if (!id) return "Todo el catálogo";
    return products?.find((p) => p.id === id)?.name ?? "Producto";
  };

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
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">Ofertas</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-2 rounded-md min-h-11 bg-[#1e3a5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#16294a]"
          >
            <Plus className="h-4 w-4" /> Nueva
          </button>
        </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 space-y-3 rounded-md border border-border bg-card p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Toda la tienda</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto fijo (USD)</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor del descuento"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md min-h-11 bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16294a] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear oferta"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !offers || offers.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No tienes ofertas activas.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="font-semibold">{productName(o.product_id)}</div>
                <div className="text-xs text-muted-foreground">
                  {o.ends_at
                    ? `Termina: ${new Date(o.ends_at).toLocaleDateString()}`
                    : "Sin fecha de fin"}
                </div>
              </div>
              <div className="rounded-md bg-amber-100 px-2 py-1 text-sm font-bold text-amber-800">
                {o.discount_type === "porcentaje"
                  ? `-${o.discount_value}%`
                  : `-USD ${o.discount_value.toFixed(2)}`}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  o.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                }`}
              >
                {o.is_active ? "Activa" : "Inactiva"}
              </span>
              <button
                onClick={() => handleDelete(o.id)}
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
