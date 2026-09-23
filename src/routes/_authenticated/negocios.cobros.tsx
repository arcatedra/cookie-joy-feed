import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createExpressAccountLink, getConnectStatus } from "@/lib/store-connect.functions";

export const Route = createFileRoute("/_authenticated/negocios/cobros")({
  head: () => ({
    meta: [
      { title: "Cobros de mi tienda — HAZOREX" },
      {
        name: "description",
        content:
          "Conecta tu cuenta de cobro para recibir automáticamente el dinero de tus ventas en Hazorex.",
      },
      { property: "og:title", content: "Cobros de mi tienda — HAZOREX" },
      {
        property: "og:description",
        content: "Recibe el dinero de tus ventas directamente en tu cuenta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CobrosPage,
});

function CobrosPage() {
  const fetchStatus = useServerFn(getConnectStatus);
  const createLink = useServerFn(createExpressAccountLink);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["store-connect-status"],
    queryFn: () => fetchStatus(),
    retry: false,
    staleTime: 30_000,
  });

  const start = async () => {
    setBusy(true);
    try {
      const res = await createLink({ data: { returnPath: "/negocios/cobros" } });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el registro.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link to="/negocios/panel" className="text-sm text-muted-foreground hover:underline">
        ← Volver al panel
      </Link>
      <h1 className="mt-3 text-2xl font-black">Cobros de mi tienda</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El cliente paga todo junto en Hazorex. Cuando cobras un pedido, el valor de tus
        productos se te transfiere automáticamente a tu cuenta.
      </p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}

      {error && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="text-sm">No pudimos cargar tu información de cobros.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold">{data.businessName}</h2>

          {data.status === "complete" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Tu cuenta está lista. Recibes tu dinero automáticamente, una vez al día.
            </p>
          ) : data.status === "pending" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Te faltan datos por completar. Mientras tanto tu dinero queda guardado en
              Hazorex y se te envía en cuanto termines.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Todavía no has abierto tu cuenta de cobro. Puedes seguir vendiendo: tu dinero
              se guarda y se te envía en cuanto la completes.
            </p>
          )}

          {data.status !== "complete" && (
            <button
              type="button"
              disabled={busy}
              onClick={start}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy
                ? "Abriendo…"
                : data.status === "pending"
                  ? "Terminar mi registro"
                  : "Abrir mi cuenta de cobro"}
            </button>
          )}

          {data.status === "complete" && (
            <button
              type="button"
              disabled={busy}
              onClick={start}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              Actualizar mis datos
            </button>
          )}
        </section>
      )}
    </main>
  );
}
