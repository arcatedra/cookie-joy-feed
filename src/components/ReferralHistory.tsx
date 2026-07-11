import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Users, Clock } from "lucide-react";
import { getMyReferralHistory } from "@/lib/referrals.functions";

interface Props {
  userId: string | null | undefined;
}

export function ReferralHistory({ userId }: Props) {
  const fetchHistory = useServerFn(getMyReferralHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["referral-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const res = await fetchHistory();
        return res.items;
      } catch {
        return [] as Array<{
          referee_display_name: string;
          invited_at: string;
          reward_granted: boolean;
          rewarded_at: string | null;
        }>;
      }
    },
    staleTime: 30_000,
  });

  if (!userId) return null;

  const items = data ?? [];
  const rewarded = items.filter((i) => i.reward_granted).length;
  const stars = rewarded * 5;

  return (
    <section className="mt-4 px-5">
      <div className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-card-foreground">
              Historial de invitaciones
            </h3>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-700 dark:text-yellow-300">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>+{stars} ⭐ ganadas</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Ganas <span className="font-semibold text-foreground">5 estrellas</span> cuando tu
          invitado se registra y entra por primera vez al sorteo diario con tickets pagados.
        </p>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
              Cargando…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Aún no has invitado a nadie. ¡Comparte tu QR o enlace!
            </div>
          ) : (
            items.map((item, idx) => {
              const invited = new Date(item.invited_at);
              const rewardedDate = item.rewarded_at ? new Date(item.rewarded_at) : null;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.referee_display_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {invited.toLocaleDateString()} · {invited.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {item.reward_granted ? (
                    <span
                      className="ml-3 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                      title={rewardedDate ? `Otorgado ${rewardedDate.toLocaleDateString()}` : undefined}
                    >
                      <Star className="h-3 w-3 fill-current" /> +5 ⭐
                    </span>
                  ) : (
                    <span className="ml-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Pendiente
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
