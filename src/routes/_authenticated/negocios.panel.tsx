import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Clock, Loader2, Plus, Store, Trash2, Upload } from "lucide-react";
import {
  getMyStore,
  updateMyStore,
  listMyCatalog,
  saveCategory,
  deleteCategory,
  saveProduct,
  deleteProduct,
  setProductAvailability,
} from "@/lib/store.functions";
import { DAY_KEYS, UNIT_OPTIONS, type DayKey, type StoreSchedule } from "@/lib/store";
import { NYC_DELIVERY_ZONES } from "@/lib/nyc-zones";
import { LoadErrorState } from "@/components/LoadErrorState";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/negocios/panel")({
  head: () => ({
    meta: [
      { title: "Panel de mi tienda — Hazorex" },
      { name: "description", content: "Administra el catálogo, horario y datos de tu tienda en Hazorex." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StorePanelPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

async function uploadMedia(file: File, prefix: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${uid}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("store-media").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

function StorePanelPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchStore = useServerFn(getMyStore);

  const storeQ = useQuery({
    queryKey: ["my-store"],
    queryFn: () => fetchStore(),
    retry: false,
    staleTime: 60_000,
  });

  if (storeQ.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (storeQ.error) {
    return (
      <LoadErrorState
        message={(storeQ.error as Error).message}
        onRetry={() => storeQ.refetch()}
      />
    );
  }

  const store = storeQ.data as any;

  if (!store) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <Store className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-serif text-2xl font-bold">{t("storePanel.noBusinessTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("storePanel.noBusinessBody")}</p>
        <Link
          to="/negocios/registro"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#1a0f0a] px-6 text-sm font-semibold text-[#E6C35C]"
        >
          {t("storePanel.registerCta")}
        </Link>
      </main>
    );
  }

  if (store.status !== "aprobado") {
    const pending = store.status === "pendiente";
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <Clock className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 font-serif text-2xl font-bold">
          {pending ? t("storePanel.pendingTitle") : t("storePanel.blockedTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending ? t("storePanel.pendingBody") : t("storePanel.blockedBody")}
        </p>
        {store.rejection_reason && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {store.rejection_reason}
          </p>
        )}
      </main>
    );
  }

  return <ApprovedPanel store={store} onStoreSaved={() => qc.invalidateQueries({ queryKey: ["my-store"] })} />;
}

function ApprovedPanel({ store, onStoreSaved }: { store: any; onStoreSaved: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchCatalog = useServerFn(listMyCatalog);
  const saveStore = useServerFn(updateMyStore);
  const saveCat = useServerFn(saveCategory);
  const delCat = useServerFn(deleteCategory);
  const saveProd = useServerFn(saveProduct);
  const delProd = useServerFn(deleteProduct);
  const setAvail = useServerFn(setProductAvailability);

  const catalogQ = useQuery({
    queryKey: ["my-catalog"],
    queryFn: () => fetchCatalog(),
    retry: false,
    staleTime: 30_000,
  });

  const [tab, setTab] = useState<"tienda" | "categorias" | "productos">("tienda");
  const [busy, setBusy] = useState(false);

  // --- Datos de la tienda
  const [descripcion, setDescripcion] = useState<string>(store.descripcion ?? "");
  const [slug, setSlug] = useState<string>(store.slug ?? "");
  const [zones, setZones] = useState<string[]>(store.zonas_que_atiende ?? []);
  const [schedule, setSchedule] = useState<StoreSchedule>(store.horario ?? {});
  const [logoPath, setLogoPath] = useState<string | null>(store.logo_url ?? null);
  const [bannerPath, setBannerPath] = useState<string | null>(store.banner_url ?? null);
  const [logoPreview, setLogoPreview] = useState<string | null>(store.logoUrl ?? null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(store.bannerUrl ?? null);

  useEffect(() => {
    setLogoPreview(store.logoUrl ?? null);
    setBannerPreview(store.bannerUrl ?? null);
  }, [store.logoUrl, store.bannerUrl]);

  async function onStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveStore({
        data: {
          descripcion: descripcion || null,
          slug,
          zonas_que_atiende: zones,
          horario: schedule as any,
          logo_url: logoPath,
          banner_url: bannerPath,
        },
      });
      toast.success(t("storePanel.saved"));
      onStoreSaved();
    } catch (err: any) {
      toast.error(err?.message ?? t("storePanel.error"));
    } finally {
      setBusy(false);
    }
  }

  async function pickMedia(file: File, kind: "logo" | "banner") {
    try {
      const path = await uploadMedia(file, kind);
      const preview = URL.createObjectURL(file);
      if (kind === "logo") {
        setLogoPath(path);
        setLogoPreview(preview);
      } else {
        setBannerPath(path);
        setBannerPreview(preview);
      }
      toast.success(t("storePanel.uploaded"));
    } catch (err: any) {
      toast.error(err?.message ?? t("storePanel.error"));
    }
  }

  // --- Categorías
  const [newCat, setNewCat] = useState("");

  async function addCategory() {
    if (!newCat.trim()) return;
    setBusy(true);
    try {
      await saveCat({ data: { nombre: newCat.trim(), orden: (catalogQ.data as any)?.categories?.length ?? 0 } });
      setNewCat("");
      qc.invalidateQueries({ queryKey: ["my-catalog"] });
    } catch (err: any) {
      toast.error(err?.message ?? t("storePanel.error"));
    } finally {
      setBusy(false);
    }
  }

  // --- Productos
  const emptyProduct = {
    id: undefined as string | undefined,
    nombre: "",
    descripcion: "",
    precio: "",
    unidad: "unidad",
    peso_lb: "0.5",
    category_id: "" as string,
    imagen_url: null as string | null,
    imagenPreview: null as string | null,
    disponible: true,
  };
  const [pForm, setPForm] = useState({ ...emptyProduct });
  const [editing, setEditing] = useState(false);

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    const precio = Number(pForm.precio);
    if (!pForm.nombre.trim() || Number.isNaN(precio)) {
      toast.error(t("storePanel.productInvalid"));
      return;
    }
    setBusy(true);
    try {
      await saveProd({
        data: {
          id: pForm.id,
          nombre: pForm.nombre.trim(),
          descripcion: pForm.descripcion || null,
          precio,
          unidad: pForm.unidad,
          peso_lb: Math.max(0, Number(pForm.peso_lb) || 0.5),
          category_id: pForm.category_id || null,
          imagen_url: pForm.imagen_url,
          disponible: pForm.disponible,
          orden: 0,
        },
      });
      setPForm({ ...emptyProduct });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-catalog"] });
      toast.success(t("storePanel.saved"));
    } catch (err: any) {
      toast.error(err?.message ?? t("storePanel.error"));
    } finally {
      setBusy(false);
    }
  }

  const catalog = catalogQ.data as any;
  const categories: any[] = catalog?.categories ?? [];
  const products: any[] = catalog?.products ?? [];
  const publishedCount = products.filter((p) => p.disponible).length;

  const tabs = [
    { key: "tienda", label: t("storePanel.tabStore") },
    { key: "categorias", label: t("storePanel.tabCategories") },
    { key: "productos", label: t("storePanel.tabProducts") },
  ] as const;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{store.business_name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("storePanel.publishedCount", { count: publishedCount })} ·{" "}
            <Link to="/tienda/$slug" params={{ slug: store.slug }} className="underline">
              {t("storePanel.viewPublic")}
            </Link>
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key as any)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === tb.key ? "bg-[#1a0f0a] text-[#E6C35C]" : "bg-muted text-muted-foreground"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "tienda" && (
        <form onSubmit={onStoreSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaField
              label={t("storePanel.logo")}
              preview={logoPreview}
              onFile={(f) => pickMedia(f, "logo")}
            />
            <MediaField
              label={t("storePanel.banner")}
              preview={bannerPreview}
              onFile={(f) => pickMedia(f, "banner")}
            />
          </div>

          <label className="block text-sm font-semibold">
            {t("storePanel.slug")}
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              /tienda/{slug || "..."}
            </span>
          </label>

          <label className="block text-sm font-semibold">
            {t("storePanel.description")}
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-semibold">{t("storePanel.zones")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {NYC_DELIVERY_ZONES.map((z) => {
                const on = zones.includes(z);
                return (
                  <button
                    type="button"
                    key={z}
                    onClick={() => setZones(on ? zones.filter((x) => x !== z) : [...zones, z])}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      on ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {z}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">{t("storePanel.hours")}</legend>
            <div className="mt-2 space-y-2">
              {DAY_KEYS.map((d: DayKey) => {
                const day = schedule[d] ?? { closed: false, open: "09:00", close: "20:00" };
                return (
                  <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-24">{t(`storePanel.days.${d}`)}</span>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={day.closed}
                        onChange={(e) =>
                          setSchedule({ ...schedule, [d]: { ...day, closed: e.target.checked } })
                        }
                      />
                      {t("storePanel.closed")}
                    </label>
                    <input
                      type="time"
                      value={day.open}
                      disabled={day.closed}
                      onChange={(e) => setSchedule({ ...schedule, [d]: { ...day, open: e.target.value } })}
                      className="rounded border border-border px-2 py-1"
                    />
                    <input
                      type="time"
                      value={day.close}
                      disabled={day.closed}
                      onChange={(e) => setSchedule({ ...schedule, [d]: { ...day, close: e.target.value } })}
                      className="rounded border border-border px-2 py-1"
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-[#1a0f0a] px-6 text-sm font-semibold text-[#E6C35C] disabled:opacity-50"
          >
            {t("storePanel.save")}
          </button>
        </form>
      )}

      {tab === "categorias" && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder={t("storePanel.newCategory")}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              onClick={addCategory}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-[#1a0f0a] px-4 text-sm font-semibold text-[#E6C35C] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {t("storePanel.add")}
            </button>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-2">
                <input
                  defaultValue={c.nombre}
                  onBlur={async (e) => {
                    const nombre = e.target.value.trim();
                    if (!nombre || nombre === c.nombre) return;
                    await saveCat({ data: { id: c.id, nombre, orden: c.orden } });
                    qc.invalidateQueries({ queryKey: ["my-catalog"] });
                  }}
                  className="flex-1 rounded border border-transparent px-2 py-1 text-sm hover:border-border"
                />
                <button
                  onClick={async () => {
                    await delCat({ data: { id: c.id } });
                    qc.invalidateQueries({ queryKey: ["my-catalog"] });
                  }}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  aria-label={t("storePanel.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                {t("storePanel.noCategories")}
              </li>
            )}
          </ul>
        </section>
      )}

      {tab === "productos" && (
        <section className="space-y-5">
          <form onSubmit={submitProduct} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">
              {editing ? t("storePanel.editProduct") : t("storePanel.newProduct")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={pForm.nombre}
                onChange={(e) => setPForm({ ...pForm, nombre: e.target.value })}
                placeholder={t("storePanel.productName")}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                value={pForm.precio}
                onChange={(e) => setPForm({ ...pForm, precio: e.target.value })}
                inputMode="decimal"
                placeholder={t("storePanel.price")}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <select
                value={pForm.unidad}
                onChange={(e) => setPForm({ ...pForm, unidad: e.target.value })}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                value={pForm.peso_lb}
                onChange={(e) => setPForm({ ...pForm, peso_lb: e.target.value })}
                inputMode="decimal"
                placeholder="Peso (kg)"
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <select
                value={pForm.category_id}
                onChange={(e) => setPForm({ ...pForm, category_id: e.target.value })}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">{t("storePanel.noCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={pForm.descripcion}
              onChange={(e) => setPForm({ ...pForm, descripcion: e.target.value })}
              rows={2}
              placeholder={t("storePanel.productDescription")}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <MediaField
              label={t("storePanel.photo")}
              preview={pForm.imagenPreview}
              onFile={async (f) => {
                try {
                  const path = await uploadMedia(f, "product");
                  setPForm((p) => ({ ...p, imagen_url: path, imagenPreview: URL.createObjectURL(f) }));
                } catch (err: any) {
                  toast.error(err?.message ?? t("storePanel.error"));
                }
              }}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded-lg bg-[#1a0f0a] px-6 text-sm font-semibold text-[#E6C35C] disabled:opacity-50"
              >
                {t("storePanel.save")}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setPForm({ ...emptyProduct });
                    setEditing(false);
                  }}
                  className="min-h-11 rounded-lg bg-muted px-4 text-sm font-semibold"
                >
                  {t("storePanel.cancel")}
                </button>
              )}
            </div>
          </form>

          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                {p.imagenUrl ? (
                  <img src={p.imagenUrl} alt={p.nombre} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    ${Number(p.precio).toFixed(2)} / {p.unidad}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={p.disponible}
                    onChange={async (e) => {
                      await setAvail({ data: { id: p.id, disponible: e.target.checked } });
                      qc.invalidateQueries({ queryKey: ["my-catalog"] });
                    }}
                  />
                  {t("storePanel.available")}
                </label>
                <button
                  onClick={() => {
                    setPForm({
                      id: p.id,
                      nombre: p.nombre,
                      descripcion: p.descripcion ?? "",
                      precio: String(p.precio),
                      unidad: p.unidad,
                      peso_lb: String(p.peso_lb ?? 0.5),
                      category_id: p.category_id ?? "",
                      imagen_url: p.imagen_url,
                      imagenPreview: p.imagenUrl,
                      disponible: p.disponible,
                    });
                    setEditing(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded px-2 py-1 text-xs font-semibold underline"
                >
                  {t("storePanel.edit")}
                </button>
                <button
                  onClick={async () => {
                    await delProd({ data: { id: p.id } });
                    qc.invalidateQueries({ queryKey: ["my-catalog"] });
                  }}
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                  aria-label={t("storePanel.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {products.length === 0 && (
              <li className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                {t("storePanel.noProducts")}
              </li>
            )}
          </ul>
        </section>
      )}
    </main>
  );
}

function MediaField({
  label,
  preview,
  onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (f: File) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <div className="mt-1 flex items-center gap-3">
        {preview ? (
          <img src={preview} alt={label} className="h-16 w-24 rounded-lg object-cover" />
        ) : (
          <div className="grid h-16 w-24 place-items-center rounded-lg bg-muted">
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
          className="text-xs font-normal"
        />
      </div>
    </label>
  );
}
