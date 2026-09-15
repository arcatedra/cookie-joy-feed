import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Shield, PackageCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listOrdersToCapture,
  captureOrder,
  type PackingOrder,
} from "@/lib/order-capture.functions";

export const Route = createFileRoute("/admin/empaque")({
  component: AdminEmpaquePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · Empaque y cobro" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const money = (n: number) => `$${n.toFixed(2)}`;

type Draft = Record<string, { cantidad: number; precioUnitario: number }>;

function AdminEmpaquePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  const listFn = useServerFn(listOrdersToCapture);
  const captureFn = useServerFn(captureOrder);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user, loading, navigate]);

  const listQuery = useQuery({
    queryKey: ["admin-empaque"],
    enabled: isAdmin === true,
    queryFn: () => listFn(),
  });

  const orders = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  // Arranca cada pedido con lo que el cliente pidió.
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const o of orders) {
        if (next[o.id]) continue;
        const d: Draft = {};
        for (const it of o.items) {
          d[it.id] = { cantidad: it.cantidad, precioUnitario: it.precioUnitario };
        }
        next[o.id] = d;
      }
      return next;
    });
  }, [orders]);

  const captureMutation = useMutation({
    mutationFn: async (o: PackingOrder) => {
      const d = drafts[o.id] ?? {};
      return captureFn({
        data: {
          pedidoId: o.id,
          items: o.items.map((it) => ({
            id: it.id,
            cantidad: d[it.id]?.cantidad ?? it.cantidad,
            precioUnitario: d[it.id]?.precioUnitario ?? it.precioUnitario,
          })),
        },
      });
    },
    onSuccess: (res) => {
      setConfirming(null);
      if (!res.ok) {
        toast.error(res.error);
      } else if (res.recortado) {
        toast.warning(
          `Se cobró el máximo reservado: ${money(res.capturado)}. El pedido supera la reserva.`,
        );
      } else {
        toast.success(
          `Cobrado ${money(res.capturado)}. Se liberan ${money(res.sobrante)} de la reserva.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["admin-empaque"] });
    },
    onError: (err: unknown) => {
      setConfirming(null);
      toast.error(err instanceof Error ? err.message : "Error al cobrar");
    },
  });

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-bold">Acceso restringido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta sección es solo para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Empaque y cobro</h1>
        <p className="text-sm text-muted-foreground">
          Ajusta lo que realmente se empacó y cobra solo ese monto. Nunca se cobra más de lo
          reservado.
        </p>
      </header>

      {listQuery.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!listQuery.isLoading && orders.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay pedidos pendientes de cobro.
        </p>
      )}

      {orders.map((o) => {
        const d = drafts[o.id] ?? {};
        const realCents = o.items.reduce((s, it) => {
          const q = d[it.id]?.cantidad ?? it.cantidad;
          const p = d[it.id]?.precioUnitario ?? it.precioUnitario;
          return s + Math.round(p * 100) * q;
        }, 0);
        const realTotal = realCents / 100 + o.costoEnvio + o.impuestos;
        const authorized = o.montoAutorizado ?? 0;
        const excede = realTotal > authorized + 0.001;

        return (
          <Card key={o.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>Pedido {o.numeroPedido}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Reservado: {money(authorized)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {o.capturaError && (
                <p className="flex items-start gap-2 rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Último intento falló. Revisa la tarjeta del cliente.
                </p>
              )}

              <div className="space-y-2">
                {o.items.map((it) => {
                  const cur = d[it.id] ?? {
                    cantidad: it.cantidad,
                    precioUnitario: it.precioUnitario,
                  };
                  return (
                    <div
                      key={it.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                    >
                      <span className="min-w-[140px] flex-1 text-sm">{it.nombre}</span>
                      <label className="text-xs text-muted-foreground">
                        Cant.
                        <Input
                          type="number"
                          min={0}
                          className="mt-0.5 h-9 w-20"
                          value={cur.cantidad}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [o.id]: {
                                ...prev[o.id],
                                [it.id]: { ...cur, cantidad: Math.max(0, Number(e.target.value)) },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Precio
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="mt-0.5 h-9 w-24"
                          value={cur.precioUnitario}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [o.id]: {
                                ...prev[o.id],
                                [it.id]: {
                                  ...cur,
                                  precioUnitario: Math.max(0, Number(e.target.value)),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Productos empacados</span>
                  <span>{money(realCents / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío e impuestos</span>
                  <span>{money(o.costoEnvio + o.impuestos)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                  <span>Se cobrará</span>
                  <span>{money(excede ? authorized : realTotal)}</span>
                </div>
                {excede && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    El pedido supera la reserva ({money(realTotal)}). Se cobrará el tope{" "}
                    {money(authorized)}; quita artículos si no quieres asumir la diferencia.
                  </p>
                )}
              </div>

              {confirming === o.id ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    disabled={captureMutation.isPending}
                    onClick={() => captureMutation.mutate(o)}
                  >
                    {captureMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmar cobro de {money(excede ? authorized : realTotal)}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirming(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={captureMutation.isPending}
                  onClick={() => setConfirming(o.id)}
                >
                  <PackageCheck className="mr-2 h-5 w-5" />
                  Terminé de empacar · cobrar {money(excede ? authorized : realTotal)}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
