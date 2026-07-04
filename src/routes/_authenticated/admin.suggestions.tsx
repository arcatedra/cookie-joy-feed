import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListSuggestions,
  adminMarkRead,
  adminUpdateSuggestionStatus,
} from "@/lib/suggestions.functions";
import { ArrowLeft, Loader2, Inbox, CheckCircle2, Archive, Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/suggestions")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Buzón de sugerencias — Admin Hazorex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSuggestionsPage,
  errorComponent: () => <div className="p-6 text-sm text-destructive">Error cargando el buzón.</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

interface Suggestion {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  title: string | null;
  content: string;
  category: string;
  status: "unread" | "read" | "resolved" | "archived";
  read_at: string | null;
  created_at: string;
}

type Filter = "all" | "unread" | "read" | "resolved" | "archived";

const CATEGORY_LABEL: Record<string, string> = {
  sugerencia: "Sugerencia",
  queja: "Queja",
  idea: "Idea",
  otro: "Otro",
};

function AdminSuggestionsPage() {
  const listFn = useServerFn(adminListSuggestions);
  const markReadFn = useServerFn(adminMarkRead);
  const updateStatusFn = useServerFn(adminUpdateSuggestionStatus);
  const qc = useQueryClient();

  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-suggestions", filter],
    queryFn: async () =>
      (await listFn({ data: { status: filter === "all" ? undefined : filter } })) as {
        suggestions: Suggestion[];
        unreadCount: number;
      },
    refetchInterval: 15_000,
  });

  const suggestions = data?.suggestions ?? [];
  const unread = data?.unreadCount ?? 0;

  const selected = useMemo(
    () => suggestions.find((s) => s.id === selectedId) ?? null,
    [suggestions, selectedId],
  );

  // Auto-mark as read when opening.
  useEffect(() => {
    if (!selected || selected.status !== "unread") return;
    (async () => {
      try {
        await markReadFn({ data: { id: selected.id } });
        qc.invalidateQueries({ queryKey: ["admin-suggestions"] });
      } catch {}
    })();
  }, [selected?.id]);

  async function setStatus(id: string, status: Suggestion["status"]) {
    await updateStatusFn({ data: { id, status } });
    qc.invalidateQueries({ queryKey: ["admin-suggestions"] });
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
          <Inbox className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground">Buzón de sugerencias</h1>
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {unread} sin leer
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 pt-4 md:grid-cols-[320px_1fr]">
        {/* List */}
        <section className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          <div className="flex flex-wrap gap-1 border-b border-border px-2 py-2">
            {(["all", "unread", "read", "resolved", "archived"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {f === "all"
                  ? "Todas"
                  : f === "unread"
                    ? "No leídas"
                    : f === "read"
                      ? "Leídas"
                      : f === "resolved"
                        ? "Resueltas"
                        : "Archivadas"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sin sugerencias.</div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {suggestions.map((s) => {
                const isSel = s.id === selectedId;
                const isUnread = s.status === "unread";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full px-3 py-3 text-left transition ${
                        isSel ? "bg-accent" : "hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isUnread ? (
                          <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                        ) : (
                          <Circle className="h-2.5 w-2.5 text-muted-foreground/40" />
                        )}
                        <span
                          className={`truncate text-sm ${isUnread ? "font-bold text-foreground" : "text-foreground"}`}
                        >
                          {s.title || s.content.slice(0, 60)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {s.user_name || s.user_email || "Anónimo"} · {CATEGORY_LABEL[s.category] ?? s.category}
                        </span>
                        <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Detail */}
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border min-h-[300px]">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecciona una sugerencia para ver el detalle.
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {CATEGORY_LABEL[selected.category] ?? selected.category}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">
                    {selected.title || "(Sin asunto)"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    De <strong>{selected.user_name || "Sin nombre"}</strong>{" "}
                    {selected.user_email ? `· ${selected.user_email}` : ""}
                    <br />
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                  {selected.status === "unread"
                    ? "No leída"
                    : selected.status === "read"
                      ? "Leída"
                      : selected.status === "resolved"
                        ? "Resuelta"
                        : "Archivada"}
                </span>
              </div>

              <div className="mt-4 whitespace-pre-wrap rounded-xl bg-background p-4 text-sm leading-relaxed ring-1 ring-border">
                {selected.content}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus(selected.id, "resolved")}
                  disabled={selected.status === "resolved"}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Marcar como resuelta
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(selected.id, "archived")}
                  disabled={selected.status === "archived"}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" /> Archivar
                </button>
                {selected.status !== "unread" && (
                  <button
                    type="button"
                    onClick={() => setStatus(selected.id, "unread")}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
                  >
                    Marcar como no leída
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
