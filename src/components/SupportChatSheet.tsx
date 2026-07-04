import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HazorexLogo } from "@/components/HazorexLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversationByIssue,
  sendCustomerMessage,
  acceptReplacement,
  cancelIssueItem,
} from "@/lib/support.functions";
import { Send, ShieldCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Message {
  id: string;
  sender: "support" | "customer" | "system";
  body: string;
  action: string | null;
  created_at: string;
}
interface Issue {
  id: string;
  order_id: string;
  status: string;
  product_name: string;
  original_price: number;
  replacement_name: string | null;
  replacement_price: number | null;
  replacement_image: string | null;
}
interface Conversation {
  id: string;
  status: string;
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function SupportChatSheet({
  issueId,
  open,
  onOpenChange,
}: {
  issueId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const getConv = useServerFn(getConversationByIssue);
  const sendMsg = useServerFn(sendCustomerMessage);
  const acceptFn = useServerFn(acceptReplacement);
  const cancelFn = useServerFn(cancelIssueItem);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"accept" | "cancel" | "confirmCancel" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const orderShort = useMemo(
    () => (issue?.order_id ? issue.order_id.slice(0, 8).toUpperCase() : ""),
    [issue?.order_id],
  );

  useEffect(() => {
    if (!open || !issueId) return;
    setLoading(true);
    setConfirmingCancel(false);
    getConv({ data: { issueId } })
      .then((r: any) => {
        setIssue(r.issue);
        setConversation(r.conversation);
        setMessages(r.messages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, issueId, getConv]);

  useEffect(() => {
    if (!conversation?.id) return;
    const ch = supabase
      .channel(`support-conv-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Message;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const refresh = async () => {
    if (!issueId) return;
    const r: any = await getConv({ data: { issueId } });
    setIssue(r.issue);
    setConversation(r.conversation);
    setMessages(r.messages);
  };

  const doAccept = async () => {
    if (!issueId) return;
    setBusy("accept");
    try {
      await acceptFn({ data: { issueId } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async () => {
    if (!issueId) return;
    setBusy("confirmCancel");
    try {
      await cancelFn({ data: { issueId } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
      setConfirmingCancel(false);
    }
  };

  const sendFreeMsg = async () => {
    const txt = input.trim();
    if (!txt || !conversation) return;
    setInput("");
    try {
      await sendMsg({ data: { conversationId: conversation.id, body: txt } });
    } catch {
      /* ignore */
    }
  };

  const resolved = issue?.status && issue.status !== "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-[#1e3a5f] px-4 py-3 text-white">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-2 ring-amber-300">
            <HazorexLogo size={26} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold leading-tight">Soporte Hazorex</p>
            <p className="flex items-center gap-1 text-[11px] text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              En línea
            </p>
          </div>
          <ShieldCheck className="h-5 w-5 text-amber-300" />
        </div>

        {/* Order banner */}
        {issue && (
          <div className="border-b border-gray-200 bg-amber-50 px-4 py-2 text-xs text-[#1a0f0a]">
            Pedido <span className="font-mono font-bold">#{orderShort}</span> · Producto:{" "}
            <span className="font-semibold">{issue.product_name}</span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f5f5f7] px-3 py-4">
          {loading && (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {/* Replacement card + actions (only if pending) */}
            {issue && !resolved && issue.replacement_name && (
              <div className="my-2 self-start w-[85%] rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Reemplazo sugerido
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {issue.replacement_image && (
                    <img
                      src={issue.replacement_image}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1a0f0a]">
                      {issue.replacement_name}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2 text-xs">
                      <span className="line-through text-gray-400">
                        ${Number(issue.original_price).toFixed(2)}
                      </span>
                      <span className="font-bold text-red-700">
                        ${Number(issue.replacement_price ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {issue && !resolved && (
              <div className="my-2 flex flex-col gap-2 self-stretch">
                {!confirmingCancel ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {issue.replacement_name && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={doAccept}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busy === "accept" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Aceptar reemplazo
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setConfirmingCancel(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-white px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar producto
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-white p-3">
                    <p className="text-sm text-[#1a0f0a]">
                      ¿Seguro que quieres cancelar <b>{issue.product_name}</b>? Si es el
                      único producto del pedido, se cancelará el pedido completo.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(false)}
                        disabled={busy !== null}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        onClick={doCancel}
                        disabled={busy !== null}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {busy === "confirmCancel" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Sí, cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {resolved && (
              <div className="my-2 self-center rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-700">
                Conversación cerrada
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 bg-white px-3 py-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendFreeMsg();
                }
              }}
              rows={1}
              placeholder={
                resolved ? "Conversación cerrada" : "Escribe un mensaje al equipo…"
              }
              disabled={!conversation || !!resolved}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-amber-400 focus:bg-white focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={sendFreeMsg}
              disabled={!input.trim() || !!resolved}
              className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-[#1a0f0a] shadow hover:bg-amber-300 disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isCustomer = msg.sender === "customer";
  const isSystem = msg.sender === "system";

  if (isSystem) {
    return (
      <div className="my-1 self-center max-w-[85%] rounded-full bg-gray-200 px-3 py-1 text-center text-[11px] text-gray-700">
        {msg.body}
      </div>
    );
  }

  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"} gap-2`}>
      {!isCustomer && (
        <div className="mt-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1e3a5f] ring-1 ring-amber-300">
          <HazorexLogo size={16} />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isCustomer
            ? "rounded-br-sm bg-amber-400 text-[#1a0f0a]"
            : "rounded-bl-sm bg-white text-[#1a0f0a]"
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.body}</p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isCustomer ? "text-[#1a0f0a]/60" : "text-gray-400"
          }`}
        >
          {fmtTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}
