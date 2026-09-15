import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, MessageCircle, Pencil, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { listOrderMessages, sendOrderMessage, markMessagesRead } from "@/lib/chat.functions";
import {
  QUICK_MESSAGE_KEYS,
  quickMessageText,
  type QuickMessageKey,
} from "@/lib/driver-quick-messages";
import { CONTACT_BLOCK_MESSAGE } from "@/lib/contact-filter";

const CUSTOMER_QUICK = [
  "Toca el timbre por favor.",
  "Déjalo en la puerta.",
  "Estoy en camino.",
  "Llámame cuando llegues.",
];

export function ChatDrawer({
  orderId,
  role,
  open,
  onOpenChange,
}: {
  orderId: string;
  role: "driver" | "customer";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendOrderMessage);
  const markFn = useServerFn(markMessagesRead);
  const [text, setText] = useState("");
  const [freeTextOpen, setFreeTextOpen] = useState(role === "customer");
  const [blocked, setBlocked] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["order-messages", orderId],
    queryFn: () => listOrderMessages({ data: { orderId } }),
    refetchInterval: open ? 5000 : false,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        () => qc.invalidateQueries({ queryKey: ["order-messages", orderId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  // Mark read when opening
  useEffect(() => {
    if (open) {
      markFn({ data: { orderId } }).catch(() => {});
    }
  }, [open, orderId, markFn]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, open]);

  const send = useMutation({
    mutationFn: (body: string) => sendFn({ data: { orderId, body, isQuickReply: false } }),
    onSuccess: (res) => {
      if (res && res.blocked) {
        setBlocked(res.message ?? CONTACT_BLOCK_MESSAGE);
        return;
      }
      setBlocked(null);
      setText("");
      qc.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
  });

  const quick = useMutation({
    mutationFn: ({ body, quickKey }: { body: string; quickKey?: QuickMessageKey }) =>
      sendFn({ data: { orderId, body, isQuickReply: true, ...(quickKey ? { quickKey } : {}) } }),
    onSuccess: (res) => {
      if (res && res.blocked) {
        setBlocked(res.message ?? CONTACT_BLOCK_MESSAGE);
        return;
      }
      setBlocked(null);
      qc.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[85vh] flex-col rounded-t-2xl p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <MessageCircle className="size-5" /> Chat del pedido
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto bg-[#f4f1ea] p-4">
          {messages.isLoading && <Loader2 className="mx-auto size-5 animate-spin text-[#1e3a5f]" />}
          {messages.data?.length === 0 && (
            <p className="pt-8 text-center text-sm text-[#4a3525]/70">
              No hay mensajes aún. Envía uno para iniciar la conversación.
            </p>
          )}
          {messages.data?.map((m) => {
            const mine = m.sender_role === role;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    mine
                      ? "rounded-br-sm bg-[#1e3a5f] text-white"
                      : "rounded-bl-sm bg-white text-[#1e3a5f]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-[#4a3525]/60"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t bg-white p-3">
          {blocked && (
            <div className="mb-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {blocked}
            </div>
          )}
          {role === "driver" ? (
            <>
              <div className="grid gap-2">
                {QUICK_MESSAGE_KEYS.map((key) => (
                  <button
                    key={key}
                    disabled={quick.isPending}
                    onClick={() => quick.mutate({ body: quickMessageText(key, "es"), quickKey: key })}
                    className="w-full rounded-xl border-2 border-[#1e3a5f]/15 bg-[#f4f1ea] px-4 py-4 text-left text-base font-semibold text-[#1e3a5f] shadow-sm active:scale-[0.99] disabled:opacity-60"
                  >
                    {quickMessageText(key, "es")}
                  </button>
                ))}
              </div>

              {freeTextOpen ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-[#4a3525]/70">Escribir mensaje</span>
                    <button
                      onClick={() => setFreeTextOpen(false)}
                      className="flex items-center gap-1 text-xs text-[#4a3525]/70 underline"
                    >
                      <X className="size-3" /> Cerrar
                    </button>
                  </div>
                  <Composer
                    text={text}
                    setText={setText}
                    onSend={() => send.mutate(text.trim())}
                    pending={send.isPending}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setFreeTextOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1 py-1 text-xs text-[#4a3525]/70 underline"
                >
                  <Pencil className="size-3" /> Escribir mensaje
                </button>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {CUSTOMER_QUICK.map((q) => (
                  <button
                    key={q}
                    disabled={quick.isPending}
                    onClick={() => quick.mutate({ body: q })}
                    className="shrink-0 rounded-full border border-[#c8862e]/40 bg-[#f4f1ea] px-3 py-1 text-xs text-[#1e3a5f] hover:bg-[#E6C35C]/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <Composer
                text={text}
                setText={setText}
                onSend={() => send.mutate(text.trim())}
                pending={send.isPending}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Composer({
  text,
  setText,
  onSend,
  pending,
}: {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un mensaje..."
        rows={1}
        className="min-h-[44px] resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) onSend();
          }
        }}
      />
      <Button
        size="icon"
        className="size-11 shrink-0 bg-[#1e3a5f] hover:bg-[#0f2338]"
        disabled={!text.trim() || pending}
        onClick={onSend}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      </Button>
    </div>
  );
}
