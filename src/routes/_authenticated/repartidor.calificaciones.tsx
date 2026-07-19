import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, ArrowLeft, Loader2 } from "lucide-react";
import { getMyDriverRatings } from "@/lib/chat.functions";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/repartidor/calificaciones")({
  component: RatingsPage,
});

function RatingsPage() {
  const q = useQuery({
    queryKey: ["driver-ratings"],
    queryFn: () => getMyDriverRatings(),
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }
  const data = q.data;
  if (!data) return null;

  const maxDist = Math.max(1, ...data.dist.map((d) => d.count));

  return (
    <div className="min-h-screen bg-[#f4f1ea] pb-10">
      <header className="flex items-center gap-3 border-b border-[#c8862e]/30 bg-white p-4">
        <Link to="/repartidor" className="text-[#1e3a5f]">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">Mis calificaciones</h1>
      </header>

      <div className="mx-auto max-w-md space-y-4 p-4">
        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="p-6 text-center">
            <p className="text-5xl font-bold text-[#1e3a5f]">
              {data.avg.toFixed(2)}
            </p>
            <div className="mt-2 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-5 ${
                    s <= Math.round(data.avg) ? "fill-[#E6C35C] text-[#E6C35C]" : "text-[#c8862e]/30"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-sm text-[#4a3525]">{data.total} calificaciones</p>
          </CardContent>
        </Card>

        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="space-y-2 p-4">
            {data.dist.slice().reverse().map((d) => (
              <div key={d.stars} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-[#4a3525]">{d.stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f4f1ea]">
                  <div
                    className="h-full bg-[#E6C35C]"
                    style={{ width: `${(d.count / maxDist) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-[#4a3525]/70">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-[#1e3a5f]">Comentarios recientes</h2>
          {data.ratings.length === 0 && (
            <p className="rounded-lg bg-white p-6 text-center text-sm text-[#4a3525]/70">
              Aún no tienes calificaciones. Sigue entregando y aparecerán aquí.
            </p>
          )}
          {data.ratings.map((r) => (
            <Card key={r.id} className="border-[#c8862e]/30 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-4 ${
                          s <= r.stars ? "fill-[#E6C35C] text-[#E6C35C]" : "text-[#c8862e]/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#4a3525]/60">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-[#4a3525]">{r.comment}</p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.tags as string[]).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#E6C35C]/20 px-2 py-0.5 text-[10px] font-medium text-[#1e3a5f]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
