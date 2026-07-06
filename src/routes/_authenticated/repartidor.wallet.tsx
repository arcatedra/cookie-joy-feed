import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Zap,
  Calendar,
  TrendingUp,
  Package,
  Plus,
  CreditCard,
  Loader2,
  ChevronLeft,
  Trash2,
  Star,
  StarOff,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getWalletSummary,
  listOrderEarnings,
  listPayoutMethods,
  addPayoutMethod,
  setDefaultPayoutMethod,
  deletePayoutMethod,
  listInstantPayouts,
  requestInstantPayout,
  cancelInstantPayout,
} from "@/lib/wallet.functions";

export const Route = createFileRoute("/_authenticated/repartidor/wallet")({
  component: WalletPage,
});

type MethodType = "bank_transfer" | "paypal" | "yappy" | "other";

const METHOD_LABELS: Record<MethodType, string> = {
  bank_transfer: "Transferencia bancaria",
  paypal: "PayPal",
  yappy: "Yappy",
  other: "Otro",
};

function WalletPage() {
  const qc = useQueryClient();
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [addMethodOpen, setAddMethodOpen] = useState(false);

  const summary = useQuery({
    queryKey: ["wallet", "summary"],
    queryFn: () => getWalletSummary(),
  });
  const earnings = useQuery({
    queryKey: ["wallet", "earnings"],
    queryFn: () => listOrderEarnings(),
  });
  const methods = useQuery({
    queryKey: ["wallet", "methods"],
    queryFn: () => listPayoutMethods(),
  });
  const payouts = useQuery({
    queryKey: ["wallet", "payouts"],
    queryFn: () => listInstantPayouts(),
  });

  const s = summary.data;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="border-b border-[#c8862e]/30 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/repartidor" className="text-[#4a3525] hover:text-[#1e3a5f]">
            <ChevronLeft className="size-5" />
          </Link>
          <Wallet className="size-6 text-[#1e3a5f]" />
          <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">Mi wallet</h1>
          <Link
            to="/repartidor/facturas"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#c8862e]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#1e3a5f] hover:bg-[#f4f1ea]"
          >
            <FileText className="size-3.5" />
            Mis recibos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Balance hero */}
        <Card className="border-none bg-gradient-to-br from-[#1e3a5f] to-[#0f2338] text-white">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wider text-[#E6C35C]">
              Balance disponible
            </p>
            <p className="mt-1 font-serif text-4xl font-bold">
              {summary.isLoading ? (
                <Loader2 className="size-8 animate-spin" />
              ) : (
                `$${(s?.available_balance ?? 0).toFixed(2)}`
              )}
            </p>
            {s && s.pending_hold > 0 && (
              <p className="mt-1 text-xs text-white/70">
                ${s.pending_hold.toFixed(2)} en solicitudes pendientes
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                onClick={() => setCashoutOpen(true)}
                disabled={!s || s.available_balance < (s?.instant_payout_min ?? 5)}
                className="bg-[#E6C35C] font-semibold text-[#1e3a5f] hover:bg-[#d4b04b]"
              >
                <Zap className="mr-1.5 size-4" /> Cobro instantáneo
              </Button>
              <div className="flex flex-col items-end justify-center text-right">
                <p className="text-xs text-white/70">Próximo pago</p>
                <p className="text-sm font-semibold">
                  {s
                    ? new Date(s.next_scheduled_payout_at).toLocaleDateString(
                        "es",
                        { weekday: "short", day: "numeric", month: "short" },
                      )
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Esta semana"
            value={`$${(s?.week_earnings ?? 0).toFixed(2)}`}
            sub={`${s?.week_deliveries ?? 0} entregas`}
          />
          <StatCard
            icon={<Package className="size-4" />}
            label="Total histórico"
            value={`$${(s?.lifetime_earnings ?? 0).toFixed(2)}`}
            sub={`${s?.lifetime_deliveries ?? 0} entregas`}
          />
        </div>

        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings">Ganancias</TabsTrigger>
            <TabsTrigger value="payouts">Cobros</TabsTrigger>
            <TabsTrigger value="methods">Métodos</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="mt-4 space-y-2">
            {earnings.isLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (earnings.data?.length ?? 0) === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-[#4a3525]">
                  Aún no tienes entregas completadas.
                </CardContent>
              </Card>
            ) : (
              earnings.data!.map((e) => (
                <Card key={e.id} className="border-[#c8862e]/20 bg-white">
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1e3a5f]">
                        {e.pickup_address ?? "Entrega"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#4a3525]/70">
                        {new Date(e.earned_at).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#4a3525]">
                        <span>Base ${e.base_amount.toFixed(2)}</span>
                        {e.tip_amount > 0 && (
                          <span className="text-emerald-700">
                            +Propina ${e.tip_amount.toFixed(2)}
                          </span>
                        )}
                        {e.bonus_amount > 0 && (
                          <span className="text-amber-700">
                            +Bono ${e.bonus_amount.toFixed(2)}
                          </span>
                        )}
                        {e.distance_amount > 0 && (
                          <span>+Distancia ${e.distance_amount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-lg font-bold text-[#1e3a5f]">
                        ${e.total_amount.toFixed(2)}
                      </p>
                      {e.paid_out_at ? (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Pagado
                        </Badge>
                      ) : (
                        <Badge className="mt-1 bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-100">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payouts" className="mt-4 space-y-2">
            {payouts.isLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (payouts.data?.length ?? 0) === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-[#4a3525]">
                  No has solicitado cobros aún.
                </CardContent>
              </Card>
            ) : (
              payouts.data!.map((p) => (
                <PayoutRow
                  key={p.id}
                  payout={p}
                  onCancel={() => {
                    qc.invalidateQueries({ queryKey: ["wallet"] });
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="methods" className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setAddMethodOpen(true)}
            >
              <Plus className="mr-1.5 size-4" /> Agregar método de pago
            </Button>

            {methods.isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="mx-auto size-5 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (methods.data?.length ?? 0) === 0 ? (
              <p className="pt-2 text-center text-sm text-[#4a3525]">
                Agrega al menos un método antes de solicitar tu primer cobro.
              </p>
            ) : (
              methods.data!.map((m) => (
                <MethodRow key={m.id} method={m} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CashoutDialog
        open={cashoutOpen}
        onOpenChange={setCashoutOpen}
        summary={s}
        methods={methods.data ?? []}
      />
      <AddMethodDialog open={addMethodOpen} onOpenChange={setAddMethodOpen} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="border-[#c8862e]/20 bg-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#c8862e]">
          {icon}
          {label}
        </div>
        <p className="mt-1 font-serif text-2xl font-bold text-[#1e3a5f]">{value}</p>
        <p className="text-xs text-[#4a3525]">{sub}</p>
      </CardContent>
    </Card>
  );
}

function PayoutRow({
  payout,
  onCancel,
}: {
  payout: {
    id: string;
    amount: number | string;
    fee_amount: number | string;
    net_amount: number | string;
    status: string;
    requested_at: string;
    reject_reason: string | null;
    driver_payout_methods: { display_label?: string } | null;
  };
  onCancel: () => void;
}) {
  const cancelFn = useServerFn(cancelInstantPayout);
  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { id: payout.id } }),
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      onCancel();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Aprobado", cls: "bg-blue-100 text-blue-800" },
    paid: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Rechazado", cls: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelado", cls: "bg-gray-100 text-gray-700" },
  };
  const st = statusMap[payout.status] ?? statusMap.pending;
  return (
    <Card className="border-[#c8862e]/20 bg-white">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-serif text-lg font-bold text-[#1e3a5f]">
              ${Number(payout.net_amount).toFixed(2)}
            </p>
            <Badge className={`${st.cls} hover:${st.cls}`}>{st.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-[#4a3525]">
            {payout.driver_payout_methods?.display_label ?? "—"} · Comisión $
            {Number(payout.fee_amount).toFixed(2)}
          </p>
          <p className="mt-0.5 text-xs text-[#4a3525]/70">
            {new Date(payout.requested_at).toLocaleString("es")}
          </p>
          {payout.reject_reason && (
            <p className="mt-1 text-xs text-red-700">{payout.reject_reason}</p>
          )}
        </div>
        {payout.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MethodRow({
  method,
}: {
  method: {
    id: string;
    method_type: string;
    display_label: string;
    account_holder: string;
    is_default: boolean;
  };
}) {
  const qc = useQueryClient();
  const setDefaultFn = useServerFn(setDefaultPayoutMethod);
  const delFn = useServerFn(deletePayoutMethod);
  const makeDefault = useMutation({
    mutationFn: () => setDefaultFn({ data: { id: method.id } }),
    onSuccess: () => {
      toast.success("Método predeterminado actualizado");
      qc.invalidateQueries({ queryKey: ["wallet", "methods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: method.id } }),
    onSuccess: () => {
      toast.success("Método eliminado");
      qc.invalidateQueries({ queryKey: ["wallet", "methods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className={`border ${method.is_default ? "border-emerald-500/60 bg-emerald-50/40" : "border-[#c8862e]/20 bg-white"}`}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <CreditCard className="size-5 text-[#1e3a5f]" />
          <div>
            <p className="font-semibold text-[#1e3a5f]">{method.display_label}</p>
            <p className="text-xs text-[#4a3525]">
              {METHOD_LABELS[method.method_type as MethodType] ?? method.method_type} ·{" "}
              {method.account_holder}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {!method.is_default && (
            <Button
              size="icon"
              variant="ghost"
              title="Poner como predeterminado"
              onClick={() => makeDefault.mutate()}
              disabled={makeDefault.isPending}
            >
              <StarOff className="size-4" />
            </Button>
          )}
          {method.is_default && (
            <div title="Predeterminado" className="grid size-9 place-items-center">
              <Star className="size-4 fill-emerald-500 text-emerald-500" />
            </div>
          )}
          <Button
            size="icon"
            variant="ghost"
            title="Eliminar"
            onClick={() => del.mutate()}
            disabled={del.isPending}
          >
            <Trash2 className="size-4 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CashoutDialog({
  open,
  onOpenChange,
  summary,
  methods,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary?: Awaited<ReturnType<typeof getWalletSummary>>;
  methods: Array<{
    id: string;
    display_label: string;
    is_default: boolean;
  }>;
}) {
  const qc = useQueryClient();
  const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string>(defaultMethod?.id ?? "");
  const reqFn = useServerFn(requestInstantPayout);
  const request = useMutation({
    mutationFn: () =>
      reqFn({
        data: {
          amount: Number(amount),
          payout_method_id: methodId,
        },
      }),
    onSuccess: (r) => {
      toast.success(
        `Solicitud enviada. Recibirás $${r.net_amount.toFixed(2)} tras revisión.`,
      );
      qc.invalidateQueries({ queryKey: ["wallet"] });
      onOpenChange(false);
      setAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const amt = Number(amount) || 0;
  const fee = summary ? amt * summary.instant_payout_fee_rate : 0;
  const net = amt - fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-[#1e3a5f]">
            <Zap className="mr-1 inline size-5 text-[#E6C35C]" /> Cobro instantáneo
          </DialogTitle>
        </DialogHeader>

        {methods.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#4a3525]">
            Primero agrega un método de pago en la pestaña "Métodos".
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`Mín. $${summary?.instant_payout_min ?? 5}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="mt-1 text-xs text-[#4a3525]">
                Disponible: ${(summary?.available_balance ?? 0).toFixed(2)}
              </p>
            </div>

            <div>
              <Label>Método de pago</Label>
              <Select value={methodId} onValueChange={setMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige método" />
                </SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_label}
                      {m.is_default ? " (predeterminado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-[#f4f1ea] p-3 text-sm">
              <div className="flex justify-between text-[#4a3525]">
                <span>Monto solicitado</span>
                <span>${amt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#4a3525]">
                <span>
                  Comisión ({((summary?.instant_payout_fee_rate ?? 0) * 100).toFixed(1)}%)
                </span>
                <span>-${fee.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#c8862e]/30 pt-2 font-semibold text-[#1e3a5f]">
                <span>Recibirás</span>
                <span>${net.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-[#4a3525]/70">
              Las solicitudes se procesan en 1-2 días hábiles.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => request.mutate()}
            disabled={
              request.isPending ||
              methods.length === 0 ||
              !methodId ||
              amt < (summary?.instant_payout_min ?? 5)
            }
            className="bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
          >
            {request.isPending ? "Enviando…" : "Solicitar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMethodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [methodType, setMethodType] = useState<MethodType>("bank_transfer");
  const [displayLabel, setDisplayLabel] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [detail1, setDetail1] = useState("");
  const [detail2, setDetail2] = useState("");

  const addFn = useServerFn(addPayoutMethod);
  const add = useMutation({
    mutationFn: () => {
      const details: Record<string, string> = {};
      if (methodType === "bank_transfer") {
        details.bank_name = detail1;
        details.account_number = detail2;
      } else if (methodType === "paypal" || methodType === "yappy") {
        details.identifier = detail1;
      } else {
        details.notes = detail1;
      }
      return addFn({
        data: {
          method_type: methodType,
          display_label: displayLabel,
          account_holder: accountHolder,
          account_details: details,
        },
      });
    },
    onSuccess: () => {
      toast.success("Método agregado");
      qc.invalidateQueries({ queryKey: ["wallet", "methods"] });
      onOpenChange(false);
      setDisplayLabel("");
      setAccountHolder("");
      setDetail1("");
      setDetail2("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-[#1e3a5f]">
            Nuevo método de pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={methodType} onValueChange={(v) => setMethodType(v as MethodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                <SelectItem value="yappy">Yappy</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nombre corto</Label>
            <Input
              placeholder="Ej: Banco General cuenta principal"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
            />
          </div>

          <div>
            <Label>Titular de la cuenta</Label>
            <Input
              placeholder="Nombre completo"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
            />
          </div>

          {methodType === "bank_transfer" && (
            <>
              <div>
                <Label>Banco</Label>
                <Input value={detail1} onChange={(e) => setDetail1(e.target.value)} />
              </div>
              <div>
                <Label>Número de cuenta</Label>
                <Input value={detail2} onChange={(e) => setDetail2(e.target.value)} />
              </div>
            </>
          )}

          {(methodType === "paypal" || methodType === "yappy") && (
            <div>
              <Label>{methodType === "paypal" ? "Correo PayPal" : "Teléfono Yappy"}</Label>
              <Input value={detail1} onChange={(e) => setDetail1(e.target.value)} />
            </div>
          )}

          {methodType === "other" && (
            <div>
              <Label>Notas / instrucciones</Label>
              <Input value={detail1} onChange={(e) => setDetail1(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => add.mutate()}
            disabled={
              add.isPending ||
              !displayLabel ||
              !accountHolder ||
              !detail1
            }
            className="bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
          >
            {add.isPending ? "Guardando…" : "Guardar método"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
