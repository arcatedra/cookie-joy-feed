import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitDriverRating } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/pedido/$id/calificar")({
  component: CalificarRepartidor,
});

const TAGS = [
  "Puntual",
  "Amable",
  "Cuidadoso",
  "Comunicativo",
  "Profesional",
  "Rápido",
];

function CalificarRepartidor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const submitFn = useServerFn(submitDriverRating);

  const submit = useMutation({
    mutationFn: () =>
      submitFn({ data: { orderId: id, stars, comment: comment.trim() || undefined, tags } }),
    onSuccess: () => {
      setDone(true);
      toast.success("¡Gracias por tu calificación!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  if (done) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea] p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-12 text-emerald-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">¡Gracias!</h1>
          <p className="text-sm text-[#4a3525]">Tu opinión ayuda a mejorar el servicio.</p>
          <Button
            className="h-12 w-full bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
            onClick={() => navigate({ to: "/" })}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-4">
      <div className="mx-auto max-w-md space-y-6 pt-8">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">
            ¿Cómo estuvo tu entrega?
          </h1>
          <p className="mt-1 text-sm text-[#4a3525]">Califica a tu repartidor</p>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(s)}
              className="transition-transform active:scale-90"
            >
              <Star
                className={`size-12 ${
                  s <= (hover || stars)
                    ? "fill-[#E6C35C] text-[#E6C35C]"
                    : "text-[#c8862e]/30"
                }`}
              />
            </button>
          ))}
        </div>

        {stars > 0 && (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-[#1e3a5f]">
                ¿Qué destacarías? (opcional)
              </p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                          : "border-[#c8862e]/40 bg-white text-[#1e3a5f]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#1e3a5f]">
                Comentario (opcional)
              </p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos más sobre tu experiencia..."
                rows={4}
                maxLength={500}
              />
            </div>
          </>
        )}

        <Button
          className="h-14 w-full bg-[#1e3a5f] text-base font-bold text-white hover:bg-[#0f2338]"
          disabled={stars === 0 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending && <Loader2 className="mr-2 size-5 animate-spin" />}
          Enviar calificación
        </Button>
      </div>
    </div>
  );
}
