import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListRecentOrders,
  adminListIssues,
  adminGetConversation,
  adminMarkProductUnavailable,
} from "@/lib/admin-support.functions";
import { HazorexLogo } from "@/components/HazorexLogo";
import { Loader2, AlertTriangle, MessageSquare, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/support")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Soporte — Admin Hazorex" }, { name: "robots", content: "noindex" }] }),
  component: AdminSupportPage,
});

interface Issue {
  id: string;
  order_id: string;
  user_id: string | null;
  item_index: number;
  product_name: string;
  original_price: number;
  replacement_name: string | null;
  replacement_price: number | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
}
interface Order {
  id: string;
  email: string;
  items: any[];
  total_usd: number;
  status: string;
  created_at: string;
}
interface Msg {
  id: string;
  sender: string;
  body: string;
  created_at: string;
}

function AdminSupportPage() {
  const listIssuesFn = useServerFn(adminListIssues);
  const listOrdersFn = useServerFn(adminListRecentOrders);
  const getConvFn = useServerFn(adminGetConversation);
  const markFn = useServerFn(adminMarkProductUnavailable);

  const [tab, setTab] = useState<"issues" | "orders">("issues");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  const [markingOrder, setMarkingOrder] = useState<Order | null>(null);
  const [markIndex, setMarkIndex] = useState(0);
  const [repName, setRepName] = useState("");
  const [repPrice, setRepPrice] = useState("");
  const [repImage, setRepImage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === "issues") {
        const r: any = await listIssuesFn({});
        setIssues(r.issues);
      } else {
        const r: any = await listOrdersFn({});
        setOrders(r.orders);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openIssue = async (i: Issue) => {
    setSelected(i);
    const r: any = await getConvFn({ data: { issueId: i.id } });
    setMessages(r.messages ?? []);
  };

  const submitMark = async () => {
    if (!markingOrder) return;
    setBusy(true);
    try {
      await markFn({
        data: {
          orderId: markingOrder.id,
          itemIndex: markIndex,
          replacementName: repName.trim() || undefined,
          replacementPrice: repPrice ? Number(repPrice) : undefined,
          replacementImage: repImage.trim() || undefined,
        },
      });
      setMarkingOrder(null);
      setRepName("");
      setRepPrice("");
      setRepImage("");
      setTab("issues");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    return (
      <main className="min-h-screen bg-[#eaeded] p-4">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-1 text-sm text-[#1a0f0a] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <HazorexLogo size={28} />
              <div>
                <h1 className="text-lg font-bold text-[#1a0f0a]">
                  Incidencia · {selected.product_name}
                </h1>
                <p className="text-xs text-gray-500">
                  Pedido #{selected.order_id.slice(0, 8).toUpperCase()} · Estado:{" "}
                  <span className="font-semibold">{selected.status}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-xl bg-[#f5f5f7] p-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.sender === "customer"
                      ? "bg-amber-100 text-[#1a0f0a]"
                      : m.sender === "system"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-white text-[#1a0f0a]"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase text-gray-500">{m.sender}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eaeded] p-4">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-2xl font-extrabold text-[#1a0f0a]">Soporte Hazorex — Admin</h1>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("issues")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "issues" ? "bg-[#1a0f0a] text-white" : "bg-white text-[#1a0f0a]"
            }`}
          >
            Incidencias
          </button>
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "orders" ? "bg-[#1a0f0a] text-white" : "bg-white text-[#1a0f0a]"
            }`}
          >
            Pedidos (marcar no disponible)
          </button>
        </div>

        {loading && (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && tab === "issues" && (
          <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5">
            {issues.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Sin incidencias.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {issues.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1a0f0a]">{i.product_name}</p>
                      <p className="text-xs text-gray-500">
                        Pedido #{i.order_id.slice(0, 8).toUpperCase()} ·{" "}
                        {new Date(i.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        i.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : i.status === "replaced"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {i.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => openIssue(i)}
                      className="ml-2 inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[#1a0f0a] hover:bg-amber-300"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Ver chat
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && tab === "orders" && (
          <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-black/5">
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Sin pedidos.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <li key={o.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1a0f0a]">
                          #{o.id.slice(0, 8).toUpperCase()} · {o.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(o.created_at).toLocaleString()} · ${Number(o.total_usd).toFixed(2)}{" "}
                          · {o.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMarkingOrder(o);
                          setMarkIndex(0);
                        }}
                        className="rounded-lg border border-red-500 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Marcar producto no disponible
                      </button>
                    </div>
                    {markingOrder?.id === o.id && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <label className="mb-2 block text-xs font-bold text-[#1a0f0a]">
                          Producto del pedido
                        </label>
                        <select
                          value={markIndex}
                          onChange={(e) => setMarkIndex(Number(e.target.value))}
                          className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          {(o.items ?? []).map((it: any, idx: number) => (
                            <option key={idx} value={idx}>
                              {idx + 1}. {it.name} × {it.qty} — ${Number(it.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            placeholder="Nombre del reemplazo"
                            value={repName}
                            onChange={(e) => setRepName(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            placeholder="Precio (USD)"
                            type="number"
                            step="0.01"
                            value={repPrice}
                            onChange={(e) => setRepPrice(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            placeholder="URL imagen (opcional)"
                            value={repImage}
                            onChange={(e) => setRepImage(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500">
                          Si no defines reemplazo, el cliente solo podrá cancelar el producto.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setMarkingOrder(null)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={submitMark}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Notificar al cliente
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
