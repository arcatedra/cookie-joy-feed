import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";
import { submitSuggestion } from "@/lib/suggestions.functions";

export const Route = createFileRoute("/_authenticated/suggestions")({
  head: () => ({
    meta: [
      { title: "Buzón de sugerencias — Hazorex" },
      { name: "description", content: "Danos tu opinión, sugerencia o idea. Nuestro equipo la revisará." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuggestionsPage,
  errorComponent: () => (
    <div className="p-6 text-sm text-destructive">No pudimos abrir el buzón. Intenta más tarde.</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const CATEGORIES = [
  { value: "sugerencia", label: "Sugerencia" },
  { value: "queja", label: "Queja" },
  { value: "idea", label: "Idea" },
  { value: "otro", label: "Otro" },
] as const;

function SuggestionsPage() {
  const submit = useServerFn(submitSuggestion);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("sugerencia");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = content.trim().length >= 3 && !sending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await submit({ data: { title: title.trim() || undefined, content: content.trim(), category } });
      setSent(true);
      setTitle("");
      setContent("");
      setCategory("sugerencia");
      toast.success("¡Gracias por tu opinión!");
    } catch (err: any) {
      toast.error(err?.message ?? "No pudimos enviar tu sugerencia");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link
          to="/profile"
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground">Buzón de sugerencias</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Cuéntanos qué te gustaría mejorar, una idea que se te ocurra o cualquier opinión. Tu mensaje llega directo a
          nuestro equipo — no lo verá el resto de usuarios.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300">
            <p className="font-semibold">¡Gracias por tu opinión!</p>
            <p className="mt-1">Será revisada por nuestro equipo.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Enviar otra
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categoría
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      category === c.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="s-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Asunto <span className="text-muted-foreground/70">(opcional)</span>
              </label>
              <input
                id="s-title"
                type="text"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Idea para la app"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="s-content" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tu opinión
              </label>
              <textarea
                id="s-content"
                required
                rows={6}
                maxLength={4000}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe aquí tu sugerencia u opinión…"
                className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">{content.length}/4000</div>
            </div>

            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
