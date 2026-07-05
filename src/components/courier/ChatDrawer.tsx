import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { listOrderMessages, sendOrderMessage, markMessagesRead } from "@/lib/chat.functions";

const DRIVER_QUICK = [
  "En camino, llego en unos minutos.",
  "Estoy afuera, ¿puedes salir?",
  "No encuentro la dirección, ¿puedes guiarme?",
  "Hay tráfico, un poco de demora.",
  "Ya recogí tu pedido.",
];
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
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
  });

  const quick = useMutation({
    mutationFn: (body: string) => sendFn({ data: { orderId, body, isQuickReply: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-messages", orderId] }),
  });

  const quickList = role === "driver" ? DRIVER_QUICK : CUSTOMER_QUICK;

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
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {quickList.map((q) => (
              <button
                key={q}
                disabled={quick.isPending}
                onClick={() => quick.mutate(q)}
                className="shrink-0 rounded-full border border-[#c8862e]/40 bg-[#f4f1ea] px-3 py-1 text-xs text-[#1e3a5f] hover:bg-[#E6C35C]/20"
              >
                {q}
              </button>
            ))}
          </div>
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
                  if (text.trim()) send.mutate(text.trim());
                }
              }}
            />
            <Button
              size="icon"
              className="size-11 shrink-0 bg-[#1e3a5f] hover:bg-[#0f2338]"
              disabled={!text.trim() || send.isPending}
              onClick={() => send.mutate(text.trim())}
            >
              {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
