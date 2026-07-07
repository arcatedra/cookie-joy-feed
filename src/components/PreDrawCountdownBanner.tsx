import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getTodayDraw } from "@/lib/daily-draw.functions";

const STORAGE_KEY = "pre-draw-banner-dismissed";

function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PreDrawCountdownBanner() {
  // Share cache with LiveDrawSection to avoid duplicate polling of get_today_draw.
  const { data } = useQuery({
    queryKey: ["daily-draw"],
    queryFn: () => getTodayDraw(),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDismissedFor(window.sessionStorage.getItem(STORAGE_KEY));
    } catch {/* ignore */}
  }, []);

  if (!data?.scheduledAt || data.status !== "open" && data.status !== "drawing") return null;

  const scheduled = new Date(data.scheduledAt).getTime();
  const msLeft = scheduled - now;

  // Show only in the last 5 min, hide once the draw passes
  if (msLeft > 5 * 60_000 || msLeft < -60_000) return null;
  if (dismissedFor === data.drawDate && msLeft > 0) return null;

  const isLive = msLeft <= 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#1e3a5f] via-[#c9a35a] to-[#1e3a5f] text-white shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-sm font-medium">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-lg leading-none">🎰</span>
          <span className="truncate">
            {isLive ? (
              <>¡El sorteo está girando ahora!</>
            ) : (
              <>
                El sorteo gira en{" "}
                <span className="font-mono font-bold tabular-nums">{formatMMSS(msLeft)}</span>
              </>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/"
            hash="sorteo"
            className="rounded-md bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-white/25"
          >
            Ver en vivo
          </Link>
          {!isLive && (
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => {
                try {
                  window.sessionStorage.setItem(STORAGE_KEY, data.drawDate);
                } catch {/* ignore */}
                setDismissedFor(data.drawDate);
              }}
              className="rounded-md px-2 py-1 text-white/80 hover:bg-white/15 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
