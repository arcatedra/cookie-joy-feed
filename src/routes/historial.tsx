import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { getDrawHistory } from "@/lib/daily-draw.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, DollarSign, Hash, ArrowLeft } from "lucide-react";

type Winner = Awaited<ReturnType<typeof getDrawHistory>>[number];

const historyQO = (fn: () => Promise<Winner[]>) =>
  queryOptions({
    queryKey: ["draw-history", 50],
    queryFn: fn,
    staleTime: 60_000,
  });

export const Route = createFileRoute("/historial")({
  head: () => ({
    meta: [
      { title: "Historial de Sorteos — ORIGEN" },
      {
        name: "description",
        content:
          "Consulta el historial completo de ganadores diarios de la Ruleta ORIGEN: nombre, fecha, monto del premio y verificación pública.",
      },
      { property: "og:title", content: "Historial de Sorteos — ORIGEN" },
      {
        property: "og:description",
        content: "Transparencia total: revisa cada ronda con su ganador, fecha y monto.",
      },
    ],
  }),
  component: HistoryPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-destructive">Error: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">No encontrado.</div>,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/ruleta"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Ruleta
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2 ml-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Historial de Sorteos
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-6">
          Cada sorteo se ejecuta diariamente a las 8:00 PM (hora del Este). Los resultados son
          públicos y verificables mediante el hash de semilla.
        </p>

        <Suspense fallback={<LoadingList />}>
          <HistoryList />
        </Suspense>
      </main>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4 h-24 animate-pulse bg-muted/40" />
      ))}
    </div>
  );
}

function HistoryList() {
  const fetchHistory = useServerFn(getDrawHistory);
  const { data: winners } = useSuspenseQuery(
    historyQO(() => fetchHistory({ data: { limit: 50 } })),
  );

  if (!winners.length) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Aún no hay sorteos completados. ¡Vuelve después de las 8:00 PM ET!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {winners.map((w) => (
        <Card key={w.drawDate} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{formatDate(w.drawDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-lg">
                  {w.winnerDisplayName || "Anónimo"}
                </span>
              </div>
              {w.seedHash && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground font-mono">
                  <Hash className="w-3 h-3" />
                  <span className="truncate" title={w.seedHash}>
                    {w.seedHash.slice(0, 16)}…
                  </span>
                </div>
              )}
            </div>
            <Badge variant="secondary" className="text-base px-3 py-1 self-start sm:self-center">
              <DollarSign className="w-4 h-4 mr-1" />
              {w.prizeUsd.toFixed(2)}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
