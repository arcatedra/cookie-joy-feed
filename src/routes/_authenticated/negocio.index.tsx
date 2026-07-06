import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store, Package, Tag, Loader2, ArrowLeft } from "lucide-react";
import {
  fetchMyBusiness,
  BUSINESS_TYPE_LABELS,
  BUSINESS_STATUS_LABELS,
  type BusinessStatus,
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
    <main className="mx-auto max-w-3xl px-4 py-8">
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
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          Tu postulación está en revisión. Te notificaremos cuando sea aprobada.
        </div>
      )}

      {data.status === "rechazado" && data.rejection_reason && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm">
          <strong>Rechazado:</strong> {data.rejection_reason}
        </div>
      )}

      {data.status === "suspendido" && (
        <div className="mb-6 rounded-md border border-slate-300 bg-slate-100 p-4 text-sm">
          Tu negocio está suspendido. {data.rejection_reason ?? "Contáctanos para más información."}
        </div>
      )}

      <dl className="mb-8 grid grid-cols-1 gap-3 rounded-md border border-border p-4 text-sm sm:grid-cols-2">
        <Row label="Email" value={data.email} />
        <Row label="Teléfono" value={data.phone} />
        <Row label="Dirección" value={data.address} />
        <Row label="Ciudad" value={data.city ?? "—"} />
      </dl>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PanelLink
          to="/negocio/productos"
          icon={<Package className="h-5 w-5" />}
          title="Productos"
          desc="Gestiona tu catálogo"
          disabled={!approved}
        />
        <PanelLink
          to="/negocio/ofertas"
          icon={<Tag className="h-5 w-5" />}
          title="Ofertas"
          desc="Crea descuentos y promociones"
          disabled={!approved}
        />
      </div>

      {!approved && (
        <p className="mt-4 text-xs text-muted-foreground">
          Podrás gestionar productos y ofertas una vez que tu negocio sea aprobado.
        </p>
      )}
    </main>
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

function PanelLink({
  to,
  icon,
  title,
  desc,
  disabled,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 rounded-md border border-border p-4 transition ${
        disabled ? "opacity-50" : "hover:border-amber-400 hover:bg-amber-50/40"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-100 text-amber-700">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
  if (disabled) return inner;
  return (
    <Link to={to} className="block">
      {inner}
    </Link>
  );
}
