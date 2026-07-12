import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { getDrawHistory } from "@/lib/daily-draw.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, DollarSign, Hash, ArrowLeft } from "lucide-react";
import i18n from "@/i18n";
import { getLocale } from "@/i18n";

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
      { title: i18n.t("historial.metaTitle") },
      { name: "description", content: i18n.t("historial.metaDesc") },
      { property: "og:title", content: i18n.t("historial.ogTitle") },
      { property: "og:description", content: i18n.t("historial.ogDesc") },
    ],
  }),
  component: HistoryPage,
  errorComponent: ({ error }) => <ErrorBlock message={error.message} />,
  notFoundComponent: () => <NotFoundBlock />,
});

function ErrorBlock({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-destructive">
        {t("historial.errorPrefix")}
        {message}
      </p>
    </div>
  );
}

function NotFoundBlock() {
  const { t } = useTranslation();
  return <div className="p-6">{t("historial.notFound")}</div>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(getLocale(), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function HistoryPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/ruleta"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("historial.backToRoulette")}
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2 ml-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {t("historial.title")}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-6">{t("historial.intro")}</p>

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
  const { t } = useTranslation();
  const fetchHistory = useServerFn(getDrawHistory);
  const { data: winners } = useSuspenseQuery(
    historyQO(() => fetchHistory({ data: { limit: 50 } })),
  );

  if (!winners.length) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("historial.empty")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {winners.map((w) => {
        const hasWinner = !!w.winnerDisplayName && w.status === "completed";
        const noEntrants = w.entrantsTotal === 0;
        const label = hasWinner
          ? w.winnerDisplayName
          : noEntrants
            ? t("historial.noParticipants", { defaultValue: "Sin participantes" })
            : t("historial.rolledOver", { defaultValue: "Sin ganador — pozo acumulado" });
        return (
          <Card key={w.drawDate} className={`p-4 hover:shadow-md transition-shadow ${hasWinner ? "" : "opacity-80"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{formatDate(w.drawDate)}</span>
                  <span className="text-xs text-muted-foreground">
                    · {t("historial.entrants", { defaultValue: "Participantes" })}: {w.entrantsTotal}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className={`w-5 h-5 ${hasWinner ? "text-yellow-500" : "text-muted-foreground"}`} />
                  <span className={`font-semibold text-lg ${hasWinner ? "" : "italic text-muted-foreground"}`}>
                    {label}
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
        );
      })}
    </div>
  );
}
