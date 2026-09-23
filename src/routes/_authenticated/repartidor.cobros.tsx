import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDriverConnectStatus, createDriverAccountLink } from "@/lib/driver-connect.functions";

export const Route = createFileRoute("/_authenticated/repartidor/cobros")({
  head: () => ({
    meta: [
      { title: "Mis cobros — Repartidor Hazorex" },
      {
        name: "description",
        content: "Conecta tu cuenta para recibir tus pagos por cada entrega.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CobrosRepartidor,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

function money(v: number) {
  return `$${(Number(v) || 0).toFixed(2)}`;
}

function CobrosRepartidor() {
  const fetchStatus = useServerFn(getDriverConnectStatus);
  const createLink = useServerFn(createDriverAccountLink);
  const [opening, setOpening] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-connect"],
    queryFn: () => fetchStatus(),
  });

  async function openOnboarding() {
    setOpening(true);
    try {
      const { url } = await createLink({ data: { returnPath: "/repartidor/cobros" } });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el registro");
      setOpening(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return <div className="p-6 text-sm">No se pudo cargar tu información.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">Mis cobros</h1>
        <p className="text-sm text-muted-foreground">
          Recibes tu pago por cada entrega: tu parte de la entrega, el cargo por peso y el 100% de
          la propina.
        </p>
      </header>

      <section className="rounded-2xl border p-4">
        {data.status === "complete" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold">Tu cuenta está lista</p>
              <p className="text-sm text-muted-foreground">
                Tus pagos se envían solos a tu banco después de cada entrega.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold">
                  {data.status === "pending" ? "Faltan datos por completar" : "Conecta tu cuenta"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tus datos bancarios los pones directamente con nuestro procesador de pagos;
                  Hazorex nunca los ve. Mientras tanto, tu dinero queda guardado como pendiente.
                </p>
              </div>
            </div>
            <Button onClick={openOnboarding} disabled={opening || !data.approved}>
              {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {data.status === "pending" ? "Continuar registro" : "Conectar mi cuenta"}
            </Button>
            {!data.approved ? (
              <p className="text-xs text-muted-foreground">
                Podrás conectarla cuando tu solicitud esté aprobada.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Ya pagado</p>
          <p className="text-2xl font-bold">{money(data.totalPagado)}</p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-xs uppercase text-muted-foreground">Pendiente</p>
          <p className="text-2xl font-bold">{money(data.totalPendiente)}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Mis pagos</h2>
        {data.payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes pagos registrados.</p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {data.payouts.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Banknote className="h-4 w-4" />
                    {money(p.amount_usd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entrega {money(p.tier_amount_usd)} · Peso {money(p.weight_amount_usd)} · Propina{" "}
                    {money(p.tip_amount_usd)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    p.status === "pagado"
                      ? "bg-emerald-100 text-emerald-800"
                      : p.status === "fallido"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {p.status === "pagado" ? "Pagado" : p.status === "fallido" ? "Falló" : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          Actualizar
        </Button>
      </section>
    </div>
  );
}
