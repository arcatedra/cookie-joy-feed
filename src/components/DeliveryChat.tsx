import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface Mensaje {
  id: number;
  autor: "cliente" | "delivery";
  texto: string;
  hora: string;
}

const MENSAJES_INICIALES: Mensaje[] = [
  { id: 1, autor: "delivery", texto: "¡Hola! Ya estoy en camino con tu pedido.", hora: "12:04" },
];

interface Props {
  nombreDelivery?: string;
  onClose?: () => void;
}

export function DeliveryChat({ nombreDelivery = "Tu delivery", onClose }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(MENSAJES_INICIALES);
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensajes]);

  const enviar = () => {
    const contenido = texto.trim();
    if (!contenido) return;
    setMensajes((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        autor: "cliente",
        texto: contenido,
        hora: new Date().toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setTexto("");
  };

  return (
    <div className="flex h-[420px] w-full flex-col rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-neutral-700" />
          <span className="text-sm font-medium text-neutral-800">{nombreDelivery}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
            aria-label="Cerrar chat"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.autor === "cliente" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m.autor === "cliente"
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-800"
              }`}
            >
              <p>{m.texto}</p>
              <span
                className={`mt-1 block text-[10px] ${
                  m.autor === "cliente" ? "text-emerald-100" : "text-neutral-400"
                }`}
              >
                {m.hora}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Escribí un mensaje con respeto..."
          className="flex-1 rounded-full border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={enviar}
          className="rounded-full bg-emerald-600 p-2 text-white transition hover:bg-emerald-700"
          aria-label="Enviar mensaje"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default DeliveryChat;
