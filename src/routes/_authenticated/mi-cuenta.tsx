import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyCliente, upsertMyCliente } from "@/lib/clientes.functions";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getMyCredit, requestCreditWithdrawal } from "@/lib/wallet-credits.functions";
import { withdrawalRequestSchema, payoutMethodSchema, type PayoutMethod } from "@/lib/withdrawal-destination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/mi-cuenta")({
  head: () => ({
    meta: [{ title: "Mi cuenta — HAZOREX" }, { name: "description", content: "Tu cuenta, saldo e historial de referidos en Hazorex." }, { property: "og:title", content: "Mi cuenta — HAZOREX" }, { property: "og:description", content: "Tu cuenta, saldo e historial de referidos en Hazorex." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }],
  }),
  component: MiCuentaPage,
});

function MiCuentaPage() {
  const { t, i18n } = useTranslation();
  const english = i18n.language.startsWith("en");
  const withdraw = useServerFn(requestCreditWithdrawal);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("zelle");
  const [payoutIdentifier, setPayoutIdentifier] = useState("");
  const destinationValid = withdrawalRequestSchema.safeParse({ amount: Number(withdrawAmount), payoutMethod, payoutIdentifier }).success;
  const [withdrawing, setWithdrawing] = useState(false);
  const fetchCliente = useServerFn(getMyCliente);
  const saveCliente = useServerFn(upsertMyCliente);
  const fetchCredit = useServerFn(getMyCredit);

  const { data: cliente, refetch, isLoading } = useQuery({
    queryKey: ["cliente", "me"],
    queryFn: () => fetchCliente(),
  });
  const { data: credit, refetch: refetchCredit, error: creditError } = useQuery({
    queryKey: ["my-credit"],
    queryFn: () => fetchCredit(),
  });

  const [form, setForm] = useState({
    nombre_completo: "",
    telefono: "",
    direccion_linea1: "",
    direccion_linea2: "",
    ciudad: "",
    estado_provincia: "",
    codigo_postal: "",
    pais: "US",
  });

  useEffect(() => {
    if (!cliente) return;
    setForm({
      nombre_completo: (cliente.nombre_completo as string) ?? "",
      telefono: (cliente.telefono as string) ?? "",
      direccion_linea1: (cliente.direccion_linea1 as string) ?? "",
      direccion_linea2: (cliente.direccion_linea2 as string) ?? "",
      ciudad: (cliente.ciudad as string) ?? "",
      estado_provincia: (cliente.estado_provincia as string) ?? "",
      codigo_postal: (cliente.codigo_postal as string) ?? "",
      pais: (cliente.pais as string) ?? "US",
    });
  }, [cliente]);

  const [saving, setSaving] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCliente({ data: form });
      toast.success("Datos guardados");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>
      <p className="text-sm text-muted-foreground">
        {(cliente?.email as string) ?? ""}
      </p>

      <section className="border rounded-lg p-4 bg-card">
        <h2 className="font-semibold mb-3">{t("credit.title")}</h2>
        {creditError && <p role="alert" className="text-sm text-destructive">{t("credit.error")}</p>}
        {credit?.environment === "sandbox" && <p className="text-xs text-muted-foreground">{t("credit.test")}</p>}
        <div className="text-3xl font-black text-emerald-600">
          ${Number(credit?.balance ?? 0).toFixed(2)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("credit.earned")}
        </p>
        {credit?.movements?.length ? (
          <ul className="mt-3 divide-y text-sm">
            {credit.movements.map((m) => (
              <li key={m.id} className="flex justify-between py-1.5">
                <span className="text-muted-foreground">
                  {t(`credit.${m.reason}`, { defaultValue: movimientoLabel(m.reason) })} · {new Date(m.created_at).toLocaleDateString()}
                </span>
                <span className={Number(m.amount_usd) < 0 ? "text-red-600" : "text-emerald-600"}>
                  {Number(m.amount_usd) < 0 ? "-" : "+"}${Math.abs(Number(m.amount_usd)).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("credit.empty")}</p>
        )}
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">{t("credit.manual")}</p>
          <label className="block text-sm">{t("credit.amount")}<input aria-label={t("credit.amount")} type="number" min="0.01" max={credit?.balance ?? 0} step="0.01" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1 block w-40 rounded-md border border-input bg-background px-3 py-2" /></label>
          <div className="space-y-1">
            <label htmlFor="payout-method" className="text-sm">{english ? "Receive with" : "Recibir por"}</label>
            <Select value={payoutMethod} onValueChange={(value) => { const method = payoutMethodSchema.safeParse(value); if (method.success) setPayoutMethod(method.data); }}>
              <SelectTrigger id="payout-method" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="zelle">Zelle</SelectItem><SelectItem value="cash_app">Cash App</SelectItem></SelectContent>
            </Select>
          </div>
          <label className="block text-sm" htmlFor="payout-identifier">{payoutMethod === "zelle" ? (english ? "Email or US phone" : "Correo o teléfono de EE. UU.") : (english ? "Email, US phone or $cashtag" : "Correo, teléfono de EE. UU. o $cashtag")}</label>
          <input id="payout-identifier" type="text" maxLength={254} autoComplete="off" value={payoutIdentifier} onChange={(e) => setPayoutIdentifier(e.target.value)} placeholder={payoutMethod === "zelle" ? "correo@ejemplo.com / +1 212 555 0123" : "$TuCashtag / correo@ejemplo.com"} aria-describedby="payout-help" className="block w-full rounded-md border border-input bg-background px-3 py-2" />
          <p id="payout-help" className="text-xs text-muted-foreground">{english ? "Never enter bank account numbers. Check the destination before requesting; it cannot be changed afterward." : "Nunca escribas números de cuenta. Revisa el destino antes de solicitar; después no puede cambiarse."}</p>
          {payoutIdentifier && !withdrawalRequestSchema.safeParse({ amount: 1, payoutMethod, payoutIdentifier }).success && <p role="alert" className="text-sm text-destructive">{english ? "Enter a valid email, US phone or Cash App $cashtag." : "Indica un correo, teléfono válido de EE. UU. o $cashtag de Cash App."}</p>}
          <Button disabled={withdrawing || !credit || !destinationValid || Number(withdrawAmount) > credit.balance} onClick={async () => {
            const parsed = withdrawalRequestSchema.safeParse({ amount: Number(withdrawAmount), payoutMethod, payoutIdentifier });
            if (!parsed.success) { toast.error(english ? "Check the amount and destination." : "Revisa el importe y el destino."); return; }
            setWithdrawing(true);
            try { await withdraw({ data: parsed.data }); setWithdrawAmount(""); setPayoutIdentifier(""); await refetchCredit(); toast.success(t("credit.requested")); }
            catch (error) { toast.error(error instanceof Error ? error.message : t("credit.error")); }
            finally { setWithdrawing(false); }
          }}>{t("credit.request")}</Button>
        </div>
        <h3 className="mt-5 font-semibold">{t("credit.history")}</h3>
        <ul className="mt-2 divide-y divide-border text-sm">{credit?.withdrawals.map((w) => <li key={w.id} className="flex flex-wrap justify-between gap-2 py-2"><div className="min-w-0"><span>{new Date(w.created_at).toLocaleDateString()} · {t(`credit.${w.status}`, { defaultValue: w.status })}</span><p className="break-all text-muted-foreground">{w.payout_identifier ? `${w.payout_method === "zelle" ? "Zelle" : "Cash App"}: ${w.payout_identifier}` : (english ? "Destination not provided (older request)" : "Destino no indicado (solicitud anterior)")}</p></div><span>${Number(w.amount_usd).toFixed(2)}</span></li>)}</ul>
        <h3 className="mt-5 font-semibold">{t("credit.bonuses")}</h3>
        <ul className="mt-2 divide-y divide-border text-sm">{credit?.rewards.map((r) => <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{new Date(r.created_at).toLocaleDateString()} · {t(r.status === "pagado" ? "credit.credited" : "credit.blocked")}</span><span>${Number(r.amount_usd).toFixed(2)}</span></li>)}</ul>
      </section>

      <form onSubmit={onSubmit} className="space-y-4 border rounded-lg p-4 bg-card">
        <h2 className="font-semibold">Datos de envío</h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            <Field label="Nombre completo" value={form.nombre_completo}
              onChange={(v) => setForm({ ...form, nombre_completo: v })} />
            <Field label="Teléfono" value={form.telefono}
              onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Dirección" value={form.direccion_linea1}
              onChange={(v) => setForm({ ...form, direccion_linea1: v })} />
            <Field label="Apto / Suite (opcional)" value={form.direccion_linea2}
              onChange={(v) => setForm({ ...form, direccion_linea2: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" value={form.ciudad}
                onChange={(v) => setForm({ ...form, ciudad: v })} />
              <Field label="Estado" value={form.estado_provincia}
                onChange={(v) => setForm({ ...form, estado_provincia: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código postal" value={form.codigo_postal}
                onChange={(v) => setForm({ ...form, codigo_postal: v })} />
              <Field label="País" value={form.pais}
                onChange={(v) => setForm({ ...form, pais: v.toUpperCase().slice(0, 2) })} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )}
      </form>

      <Link to="/mis-pedidos" className="block text-center underline">
        Ver mis pedidos →
      </Link>
    </div>
  );
}


function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground">{label}</span>
      <input
        className="w-full border rounded px-3 py-2 bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function movimientoLabel(reason: string): string {
  switch (reason) {
    case "referido":
      return "Bono por referido";
    case "uso_en_pedido":
      return "Usado en un pedido";
    case "devolucion_saldo":
      return "Saldo devuelto";
    default:
      return reason;
  }
}

