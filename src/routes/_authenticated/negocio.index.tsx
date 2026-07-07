import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Store,
  Package,
  Tag,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import {
  fetchMyBusiness,
  fetchBusinessProducts,
  fetchBusinessOffers,
  upsertProduct,
  deleteProduct,
  upsertOffer,
  deleteOffer,
  BUSINESS_TYPE_LABELS,
  BUSINESS_STATUS_LABELS,
  type BusinessStatus,
  type BusinessProduct,
  type DiscountType,
} from "@/lib/businesses";

export const Route = createFileRoute("/_authenticated/negocio/")({
  head: () => ({
    meta: [
      { title: "Mi negocio — Hazorex" },
      { name: "description", content: "Panel de tu negocio en Hazorex." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBusinessPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const STATUS_COLOR: Record<BusinessStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  aprobado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rechazado: "bg-red-100 text-red-800 border-red-200",
  suspendido: "bg-slate-200 text-slate-800 border-slate-300",
};

function MyBusinessPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-business"],
    queryFn: fetchMyBusiness,
  });
  const [tab, setTab] = useState<"info" | "catalogo" | "ofertas">("info");

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold">Aún no tienes un negocio registrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Postula el tuyo para vender en Hazorex.
        </p>
        <Link
          to="/negocios/registro"
          className="mt-6 inline-flex rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Postular mi negocio
        </Link>
      </main>
    );
  }

  const approved = data.status === "aprobado";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/profile"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">{data.business_name}</h1>
          <p className="text-sm text-muted-foreground">
            {BUSINESS_TYPE_LABELS[data.business_type]}
            {data.city ? ` · ${data.city}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLOR[data.status]}`}
        >
          {BUSINESS_STATUS_LABELS[data.status]}
        </span>
      </div>

      {data.status === "pendiente" && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tu postulación está en revisión. Te notificaremos cuando sea aprobada.
        </div>
      )}
      {data.status === "rechazado" && data.rejection_reason && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <strong>Rechazado:</strong> {data.rejection_reason}
        </div>
      )}
      {data.status === "suspendido" && (
        <div className="mb-6 rounded-md border border-slate-300 bg-slate-100 p-4 text-sm text-slate-900">
          Tu negocio está suspendido.{" "}
          {data.rejection_reason ?? "Contáctanos para más información."}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <TabBtn active={tab === "info"} onClick={() => setTab("info")} icon={<Store className="h-4 w-4" />}>
          Información
        </TabBtn>
        <TabBtn
          active={tab === "catalogo"}
          onClick={() => approved && setTab("catalogo")}
          disabled={!approved}
          icon={<Package className="h-4 w-4" />}
        >
          Catálogo
        </TabBtn>
        <TabBtn
          active={tab === "ofertas"}
          onClick={() => approved && setTab("ofertas")}
          disabled={!approved}
          icon={<Tag className="h-4 w-4" />}
        >
          Ofertas
        </TabBtn>
      </div>

      {tab === "info" && (
        <>
          <dl className="grid grid-cols-1 gap-3 rounded-md border border-border p-4 text-sm sm:grid-cols-2">
            <Row label="Email" value={data.email} />
            <Row label="Teléfono" value={data.phone} />
            <Row label="Dirección" value={data.address} />
            <Row label="Ciudad" value={data.city ?? "—"} />
          </dl>
          {!approved && (
            <p className="mt-4 text-xs text-muted-foreground">
              Podrás gestionar productos y ofertas una vez que tu negocio sea aprobado.
            </p>
          )}
        </>
      )}

      {tab === "catalogo" && approved && <CatalogTab businessId={data.id} />}
      {tab === "ofertas" && approved && <OffersTab businessId={data.id} />}
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  disabled,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-amber-600 text-amber-700"
          : "border-transparent text-muted-foreground hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

/* -------------------- Catalog Tab -------------------- */

function CatalogTab({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["business-products", businessId],
    queryFn: () => fetchBusinessProducts(businessId),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      await upsertProduct(businessId, {
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
      qc.invalidateQueries({ queryKey: ["business-products", businessId] });
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
      qc.invalidateQueries({ queryKey: ["business-products", businessId] });
      toast.success("Eliminado");
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  async function toggleActive(p: BusinessProduct) {
    try {
      await upsertProduct(businessId, {
        id: p.id,
        name: p.name,
        price: p.price,
        is_active: !p.is_active,
      });
      qc.invalidateQueries({ queryKey: ["business-products", businessId] });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Productos</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nuevo"}
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
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
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
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  p.is_active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {p.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
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
    </section>
  );
}

/* -------------------- Offers Tab -------------------- */

function OffersTab({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: offers, isLoading } = useQuery({
    queryKey: ["business-offers", businessId],
    queryFn: () => fetchBusinessOffers(businessId),
  });
  const { data: products } = useQuery({
    queryKey: ["business-products", businessId],
    queryFn: () => fetchBusinessProducts(businessId),
  });

  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("porcentaje");
  const [discountValue, setDiscountValue] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!discountValue) return;
    setSaving(true);
    try {
      await upsertOffer(businessId, {
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
      qc.invalidateQueries({ queryKey: ["business-offers", businessId] });
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
      qc.invalidateQueries({ queryKey: ["business-offers", businessId] });
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
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ofertas</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nueva"}
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
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
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
                  o.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
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
    </section>
  );
}
