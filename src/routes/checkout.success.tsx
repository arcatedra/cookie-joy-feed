import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Mail, Package, ShoppingBag } from "lucide-react";
import { getOrderBySession } from "@/lib/cart-checkout.functions";
import { useCart } from "@/lib/cart";
import { HazorexLogo } from "@/components/HazorexLogo";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pedido confirmado — HAZOREX" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SuccessPage,
});

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface OrderView {
  id: string;
  status: string;
  items: OrderItem[];
  total_usd: number;
  subtotal_usd: number;
  shipping_usd: number;
  tax_usd: number;
  email: string;
  created_at: string;
  paid_at: string | null;
}

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) {
      setError("Falta el identificador de la sesión.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await getOrderBySession({ data: { sessionId: session_id } });
        if (cancelled) return;
        if (res.found) {
          setOrder(res.order as OrderView);
          setLoading(false);
          if (res.order.status === "paid") clear();
          else if (attempts < maxAttempts) {
            setTimeout(poll, 1500); // webhook may still be in flight
          }
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(poll, 1500);
        } else {
          setError("No encontramos tu pedido. Revisa tu email en unos minutos.");
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error al cargar el pedido.");
        setLoading(false);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [session_id, clear]);

  return (
    <main className="min-h-screen bg-[#eaeded]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 lg:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="HAZOREX">
            <HazorexLogo size={28} />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {loading && (
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
              <p className="mt-4 text-sm text-gray-600">Confirmando tu pedido…</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center">
              <h1 className="text-xl font-bold text-[#1a0f0a]">Estamos procesando tu pago</h1>
              <p className="mt-3 text-sm text-gray-600">{error}</p>
              <Link
                to="/"
                className="mt-6 inline-block rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-[#1a0f0a]"
              >
                Volver al inicio
              </Link>
            </div>
          )}

          {!loading && order && (
            <>
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-12 w-12" strokeWidth={2.2} />
                </div>
                <h1 className="mt-5 text-2xl font-extrabold text-[#1a0f0a]">
                  {order.status === "paid" ? "¡Pedido confirmado!" : "Pedido recibido"} 🍪
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {order.status === "paid"
                    ? "Estamos horneando tus galletas con dedicación."
                    : "Tu pago se está procesando. Te enviaremos un email cuando esté confirmado."}
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-amber-800">Número de pedido</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#1a0f0a]">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                <Mail className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">
                  Te enviamos la confirmación a <span className="font-semibold">{order.email}</span>
                </span>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-bold text-[#1a0f0a]">Detalle</h2>
                <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {order.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between p-3 text-sm">
                      <span className="text-[#1a0f0a]">
                        {it.name} <span className="text-gray-400">× {it.qty}</span>
                      </span>
                      <span className="font-semibold">${(it.price * it.qty).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 space-y-1 text-sm">
                  <Row label="Subtotal" value={`$${order.subtotal_usd.toFixed(2)}`} />
                  <Row label="Envío" value={order.shipping_usd === 0 ? "Gratis" : `$${order.shipping_usd.toFixed(2)}`} />
                  {order.tax_usd > 0 && (
                    <Row label="Impuestos" value={`$${order.tax_usd.toFixed(2)}`} />
                  )}
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-gray-200 pt-3">
                  <span className="text-base font-bold text-[#1a0f0a]">Total</span>
                  <span className="text-2xl font-extrabold text-red-700">
                    ${order.total_usd.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Link
                  to="/historial"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#1a0f0a] bg-white px-4 py-3 text-sm font-bold text-[#1a0f0a] hover:bg-amber-50"
                >
                  <Package className="h-4 w-4" /> Ver mis pedidos
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-[#1a0f0a] shadow hover:bg-amber-300"
                >
                  <ShoppingBag className="h-4 w-4" /> Seguir comprando
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-[#1a0f0a]">{value}</span>
    </div>
  );
}
