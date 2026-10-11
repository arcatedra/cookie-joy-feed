import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createPostDeliveryTip, getPostTipPrompt } from "@/lib/post-delivery-tips.functions";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) {
    const pk = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
    stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripePromise;
}

const PRESETS = [2, 3, 5];

/** "¡Tu pedido llegó!": dejar o subir la propina hasta 24 h después de la entrega. */
export function PostDeliveryTipCard({ kind, orderId }: { kind: "cookie" | "store"; orderId: string }) {
  const fetchPrompt = useServerFn(getPostTipPrompt);
  const createTip = useServerFn(createPostDeliveryTip);
  const qc = useQueryClient();
  const queryKey = ["post-tip", kind, orderId];
  const { data } = useQuery({ queryKey, queryFn: () => fetchPrompt({ data: { kind, orderId } }) });
  const [dismissed, setDismissed] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    try { setDismissed(localStorage.getItem(`tip-dismissed-${orderId}`) === "1"); } catch { /* ignore */ }
  }, [orderId]);

  const options = useMemo(() => (clientSecret ? { clientSecret, onComplete: () => { setClientSecret(null); setRequestId(crypto.randomUUID()); toast.success("¡Gracias! Tu propina va completa a tu repartidor."); setTimeout(() => qc.invalidateQueries({ queryKey }), 2500); } } : null), [clientSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  const paid = (data?.tips ?? []).filter((t) => t.status === "pagado");
  const paidTotal = paid.reduce((s, t) => s + t.amount, 0);

  if (!data) return null;
  if (!data.eligible && paid.length === 0) return null;

  async function send() {
    if (!(amount >= 1 && amount <= 100)) return toast.error("La propina debe ser entre $1 y $100.");
    setBusy(true);
    try {
      const res = await createTip({ data: { kind, orderId, amount: Math.round(amount * 100) / 100, requestId } });
      if (res.status === "paid") {
        toast.success("¡Gracias! Tu propina va completa a tu repartidor.");
        setRequestId(crypto.randomUUID());
        await qc.invalidateQueries({ queryKey });
      } else if (res.status === "needs_payment") {
        setClientSecret(res.clientSecret);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la propina.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      {paidTotal > 0 && <p className="text-sm font-medium">Propina extra enviada: ${paidTotal.toFixed(2)} (100% para tu repartidor)</p>}
      {data.eligible && !dismissed && !clientSecret && (
        <div className={paidTotal > 0 ? "mt-3" : ""}>
          <h2 className="text-base font-bold">¡Tu pedido llegó! ¿Quieres dejar o subir la propina a tu repartidor?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            El 100% es para tu repartidor. Disponible hasta {data.deadline ? new Date(data.deadline).toLocaleString() : "24 horas después de la entrega"}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((v) => (
              <Button key={v} type="button" size="sm" variant={!custom && amount === v ? "default" : "outline"} onClick={() => { setCustom(false); setAmount(v); }}>${v}</Button>
            ))}
            <Button type="button" size="sm" variant={custom ? "default" : "outline"} onClick={() => setCustom(true)}>Otra</Button>
          </div>
          {custom && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <span>Monto ($1–$100)</span>
              <input type="number" min="1" max="100" step="0.01" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="w-28 rounded-md border border-input bg-background px-3 py-2" />
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={send}>{busy ? "Enviando…" : `Dar $${(amount || 0).toFixed(2)} de propina`}</Button>
            <Button type="button" variant="ghost" onClick={() => { setDismissed(true); try { localStorage.setItem(`tip-dismissed-${orderId}`, "1"); } catch { /* ignore */ } }}>No, gracias</Button>
          </div>
        </div>
      )}
      {clientSecret && options && (
        <div className="mt-2 overflow-hidden rounded-xl">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
          <Button variant="outline" className="mt-3" onClick={() => setClientSecret(null)}>Cancelar</Button>
        </div>
      )}
    </section>
  );
}
