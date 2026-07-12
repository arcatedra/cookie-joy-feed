import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getTodayDraw, getRecentWinners, enterDailyDraw } from "@/lib/daily-draw.functions";
import { logUiEvent } from "@/lib/ui-analytics.functions";
import { checkIsAdmin } from "@/lib/admin-check.functions";
import { useAuth } from "@/lib/auth";
import { getLocale } from "@/i18n";

// Lazy-loaded so the admin-draw bundle (triggerTestDraw, etc.) is NEVER
// shipped to non-admin visitors of /ruleta.
const AdminTestDrawPanel = lazy(() => import("./AdminTestDrawPanel"));

function AdminTestDrawGate({ onResult }: { onResult: () => void }) {
  const { user, loading } = useAuth();
  const checkAdminFn = useServerFn(checkIsAdmin);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);
    if (loading || !user) return () => { cancelled = true; };
    checkAdminFn()
      .then((r) => { if (!cancelled) setIsAdmin(r.isAdmin === true); })
      .catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [checkAdminFn, loading, user?.id]);
  if (loading || !user || !isAdmin) return null;
  return (
    <Suspense fallback={null}>
      <AdminTestDrawPanel onResult={onResult} />
    </Suspense>
  );
}


const BEIGE = "#f3ead8";
const BLUE = "#1e3a5f";
const WOOD = "#3b2417";
const GOLD = "#c9a36b";
const GOLD_BRIGHT = "#e6c181";

function useCountdownTo(targetIso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetIso) return { ms: 0, hh: "00", mm: "00", ss: "00", isLive: false };
  const ms = Math.max(0, new Date(targetIso).getTime() - now);
  const total = Math.floor(ms / 1000);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return { ms, hh, mm, ss, isLive: ms === 0 };
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useAnimatedNumber(target: number, durationMs = 1200) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (to - from) * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return display;
}

export function LiveDrawSection({ balance, onSpend }: { balance: number; onSpend: (n: number) => void }) {
  const { t, i18n } = useTranslation();

  const qc = useQueryClient();
  const fetchDraw = useServerFn(getTodayDraw);
  const fetchWinners = useServerFn(getRecentWinners);
  const enterFn = useServerFn(enterDailyDraw);

  const { data: draw } = useQuery({
    queryKey: ["daily-draw"],
    queryFn: () => fetchDraw(),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 15000;
      // poll fast when close to draw time or drawing
      if (d.status === "drawing") return 1000;
      const ms = new Date(d.scheduledAt).getTime() - Date.now();
      if (ms < 60_000 && ms > -120_000) return 2000;
      return 10_000;
    },
  });

  const { data: winners } = useQuery({
    queryKey: ["recent-winners"],
    queryFn: () => fetchWinners(),
    refetchInterval: 30000,
  });

  const cd = useCountdownTo(draw?.scheduledAt);
  const prize = useAnimatedNumber(draw?.prizeUsd ?? 0);

  // Analytics: log once per (session + draw date) when the pot is $0.00 and
  // there are only AMOE (free) entries — for auditing impact and detecting
  // days without any paid contributions.
  const zeroPotLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!draw) return;
    const isOpen = draw.status === "open";
    const prizeZero = Number(draw.prizeUsd ?? 0) === 0;
    const hasEntries = Number(draw.entrantsTotal ?? 0) > 0;
    if (!(isOpen && prizeZero && hasEntries)) return;
    const dedupeKey = `ui:zero-pot-amoe-only:${draw.drawDate}`;
    if (zeroPotLoggedRef.current === dedupeKey) return;
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(dedupeKey) === "1") {
        zeroPotLoggedRef.current = dedupeKey;
        return;
      }
    } catch { /* sessionStorage unavailable */ }
    zeroPotLoggedRef.current = dedupeKey;
    let sessionId: string | undefined;
    try {
      if (typeof window !== "undefined") {
        sessionId = sessionStorage.getItem("ui:session-id") ?? undefined;
        if (!sessionId) {
          sessionId = (crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
          sessionStorage.setItem("ui:session-id", sessionId);
        }
        sessionStorage.setItem(dedupeKey, "1");
      }
    } catch { /* ignore */ }
    void logUiEvent({
      data: {
        eventName: "daily_draw_zero_pot_amoe_only",
        sessionId,
        eventData: {
          drawDate: draw.drawDate,
          entrantsTotal: draw.entrantsTotal,
          ticketsTotal: draw.ticketsTotal,
          rolledOverFrom: draw.rolledOverFrom,
          language: typeof navigator !== "undefined" ? navigator.language : null,
          path: typeof window !== "undefined" ? window.location.pathname : null,
        },
      },
    }).catch((e) => console.warn("[ui-analytics] log failed", e));
  }, [draw?.drawDate, draw?.status, draw?.prizeUsd, draw?.entrantsTotal, draw?.ticketsTotal, draw?.rolledOverFrom]);

  // Animation orchestrator: when status flips to completed, spin + confetti
  const [spinDeg, setSpinDeg] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draw) return;
    const prev = lastStatusRef.current;
    if (draw.status === "drawing" && prev !== "drawing") {
      // start dramatic spin
      setSpinDeg((d) => d + 360 * 14 + Math.floor(Math.random() * 360));
    }
    if (draw.status === "completed" && prev !== "completed") {
      // finalize spin + celebrate
      setSpinDeg((d) => d + 360 * 18 + Math.floor(Math.random() * 360));
      setTimeout(() => {
        if (draw.winnerDisplayName) {
          setShowWinner(true);
          const end = Date.now() + 4000;
          const frame = () => {
            confetti({ particleCount: 6, angle: 60, spread: 75, origin: { x: 0 }, colors: [GOLD, GOLD_BRIGHT, BEIGE] });
            confetti({ particleCount: 6, angle: 120, spread: 75, origin: { x: 1 }, colors: [GOLD, GOLD_BRIGHT, BEIGE] });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
        }
      }, 200);
    }
    lastStatusRef.current = draw.status;
  }, [draw?.status, draw?.winnerDisplayName]);

  // Auto-trigger client-side after countdown hits 0 (server cron is authoritative; this is just for snappy UX)
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (!draw || draw.status !== "open") return;
    if (cd.ms !== 0) {
      triggeredRef.current = false;
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    // poke the hook (it self-gates by hour ET); errors are silent
    fetch("/api/public/hooks/run-daily-draw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      },
      body: "{}",
    }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["daily-draw"] });
  }, [cd.ms, draw?.status, qc]);

  const [tickets, setTickets] = useState(1);
  const [name, setName] = useState("");
  const enterMut = useMutation({
    mutationFn: async () => enterFn({ data: { tickets, displayName: name.trim() || "Anónimo" } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onSpend(tickets * 10);
      toast.success(t("liveDraw.ticketRegistered", { count: res.ticketsAdded, balance: res.newBalance }));
      qc.invalidateQueries({ queryKey: ["daily-draw"] });
      qc.invalidateQueries({ queryKey: ["roulette-state"] });
    },
    onError: () => toast.error(t("liveDraw.ticketError")),
  });


  const ticketCost = tickets * 10;
  const canAfford = balance >= ticketCost;

  const segments = useMemo(() => {
    // Reserved test keywords are never rendered on the public wheel.
    const RESERVED = new Set(["prueba", "pruebas", "test", "testing", "demo", "qa", "dummy", "ejemplo", "sample"]);
    const labels: string[] = (winners ?? [])
      .map((w: { winnerDisplayName: string | null }) => (w.winnerDisplayName ?? "").trim())
      .filter((n: string) => n.length > 0 && !RESERVED.has(n.toLowerCase()))
      .slice(0, 8);
    // Neutral placeholders (not real-looking user names) to fill the wheel.
    const placeholders = ["★", "✦", "◆", "●", "◇", "○", "✧", "☆"];
    let i = 0;
    while (labels.length < 8) labels.push(placeholders[i++ % placeholders.length]);
    return labels;
  }, [winners]);


  const status = draw?.status ?? "open";
  const isOpen = status === "open";
  const isDrawing = status === "drawing";
  const isCompleted = status === "completed";

  // Entry cutoff: inscriptions close N minutes before the scheduled draw time.
  // Pulled from DB (sweepstakes_config.entry_cutoff_minutes) so admin changes apply live.
  const ENTRY_CUTOFF_MIN = Math.max(0, Number(draw?.entryCutoffMinutes ?? 5));
  const cutoffMs = ENTRY_CUTOFF_MIN * 60_000;
  const entriesClosed = isOpen && cd.ms > 0 && cd.ms <= cutoffMs;
  const canEnter = isOpen && !entriesClosed;
  const lastMinute = cd.ms > 0 && cd.ms <= 60_000;
  // Pre-draw visual warnings on the wheel
  //  • preWarn5: soft pulse from cutoff (T-5m) down to T-30s
  //  • preWarn1: intense "suspense" pulse during the final 30 seconds
  const preWarn5 = isOpen && cd.ms > 30_000 && cd.ms <= cutoffMs;
  const preWarn1 = isOpen && cd.ms > 0 && cd.ms <= 30_000;

  // ===== Stage (fullscreen) mode =====
  // Opens 5 minutes before the draw, stays open through spin + winner celebration.
  const PRE_SHOW_MS = 5 * 60_000;
  const stageOpen = (isOpen && cd.ms <= PRE_SHOW_MS) || isDrawing || showWinner;

  // Avoid SSR/CSR hydration mismatch — countdowns depend on Date.now()
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Auto-close stage 14s after winner appears
  const stageCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forceStageClosed, setForceStageClosed] = useState(false);
  useEffect(() => {
    if (showWinner) {
      setForceStageClosed(false);
      if (stageCloseRef.current) clearTimeout(stageCloseRef.current);
      stageCloseRef.current = setTimeout(() => {
        setShowWinner(false);
      }, 14_000);
    }
    return () => {
      if (stageCloseRef.current) clearTimeout(stageCloseRef.current);
    };
  }, [showWinner]);

  // Lock body scroll while stage is up
  useEffect(() => {
    const shouldLock = stageOpen && !forceStageClosed;
    if (!shouldLock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [stageOpen, forceStageClosed]);


  const preLaunch = draw?.addressValid === false;

  return (
    <section style={{ position: "relative", display: "grid", gap: 24 }}>
      {/* Top live banner */}
      <div
        style={{
          position: "relative",
          background: `linear-gradient(135deg, ${BLUE} 0%, #0f2747 60%, #1a3358 100%)`,
          borderRadius: 28,
          padding: "28px clamp(20px,4vw,40px)",
          overflow: "hidden",
          boxShadow: `0 30px 70px -20px rgba(15,39,71,0.6), inset 0 0 0 1px ${GOLD}33`,
          color: BEIGE,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", inset: -120,
            background: `radial-gradient(circle at 50% 0%, ${GOLD_BRIGHT}44 0%, transparent 55%)`,
            animation: "ldGlow 3s ease-in-out infinite",
          }}
        />
        {preLaunch ? (
          <div style={{ position: "relative", display: "grid", placeItems: "center", gap: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.4em", color: GOLD_BRIGHT, fontWeight: 800 }}>
              {t("liveDraw.preLaunchEyebrow")}
            </div>
            <div style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, lineHeight: 1.15, maxWidth: 720 }}>
              {t("liveDraw.preLaunchTitle")}
            </div>
            <div style={{ fontSize: 14, color: `${BEIGE}cc`, maxWidth: 640, lineHeight: 1.5 }}>
              {t("liveDraw.preLaunchDescBefore")}<strong style={{ color: GOLD_BRIGHT }}>{t("liveDraw.preLaunchDescStars")}</strong>{t("liveDraw.preLaunchDescMiddle")}
              <strong style={{ color: GOLD_BRIGHT }}>{t("liveDraw.preLaunchDescRoulette")}</strong>{t("liveDraw.preLaunchDescAfter")}
            </div>
          </div>

        ) : (
          <div style={{ position: "relative", display: "grid", placeItems: "center", gap: 6, textAlign: "center" }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.4em", color: GOLD_BRIGHT, fontWeight: 800,
              animation: lastMinute && !isDrawing && !isCompleted ? "ldPulse 1s ease-in-out infinite" : undefined,
            }}>
              {isCompleted
                ? t("liveDraw.winnerEyebrow")
                : isDrawing
                ? t("liveDraw.spinningEyebrow")
                : entriesClosed
                ? t("liveDraw.entriesClosedEyebrow")
                : t("liveDraw.todayPotEyebrow")}
            </div>

            <div style={{
              fontSize: "clamp(48px, 9vw, 88px)", fontWeight: 900,
              color: BEIGE, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              textShadow: `0 0 30px ${GOLD_BRIGHT}66`, lineHeight: 1,
            }}>
              ${prize.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: "0.4em", marginLeft: 8, color: GOLD_BRIGHT }}>USD</span>
            </div>
            {!isCompleted && (
              <div style={{
                display: "flex", gap: 18, marginTop: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
                animation: lastMinute && !isDrawing ? "ldPulse 1s ease-in-out infinite" : undefined,
              }}>
                <CountdownDigit label={t("liveDraw.hours")} value={cd.hh} />
                <CountdownDigit label={t("liveDraw.minutes")} value={cd.mm} />
                <CountdownDigit label={t("liveDraw.seconds")} value={cd.ss} />
              </div>
            )}
            <div style={{ fontSize: 12, color: `${BEIGE}cc`, letterSpacing: "0.15em", marginTop: 6 }}>
              {t("liveDraw.participantsAndTickets", { participants: draw?.entrantsTotal ?? 0, tickets: draw?.ticketsTotal ?? 0 })}
              {draw?.rolledOverFrom ? t("liveDraw.rolledOverSince", { date: new Date(draw.rolledOverFrom).toLocaleDateString(getLocale(i18n.language)) }) : null}
            </div>
            {!isCompleted && (draw?.prizeUsd ?? 0) === 0 && (draw?.entrantsTotal ?? 0) > 0 && (
              <div style={{
                fontSize: 11, letterSpacing: "0.12em", color: `${BEIGE}99`, marginTop: 4,
                fontStyle: "italic", maxWidth: 520, lineHeight: 1.4,
              }}>
                {t("liveDraw.amoeOnlyNote")}
              </div>
            )}


          </div>
        )}
      </div>


      {/* Roulette + Action (hidden during pre-launch) */}
      {!preLaunch && (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: 24, alignItems: "stretch",
      }}>
        {/* Roulette */}
        <div style={{
          background: BEIGE, borderRadius: 28, padding: 24,
          boxShadow: `0 30px 70px -20px rgba(59,36,23,0.4), inset 0 0 0 1px ${WOOD}22`,
          display: "grid", placeItems: "center", minHeight: 360, position: "relative",
          animation: !isDrawing && !isCompleted
            ? (preWarn1 ? "ldRing1 0.6s ease-in-out infinite" : preWarn5 ? "ldRing5 1.6s ease-in-out infinite" : undefined)
            : undefined,
        }}>
          {(preWarn5 || preWarn1) && !isDrawing && !isCompleted && (
            <div style={{
              position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
              padding: "6px 14px", borderRadius: 999,
              background: preWarn1 ? "#c0392b" : GOLD_BRIGHT,
              color: preWarn1 ? BEIGE : WOOD,
              fontSize: 11, fontWeight: 800, letterSpacing: "0.15em",
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)", whiteSpace: "nowrap", zIndex: 3,
              animation: preWarn1 ? "ldPulse 0.6s ease-in-out infinite" : "ldPulse 1.6s ease-in-out infinite",
            }}>
              {preWarn1 ? t("liveDraw.preWarn1") : t("liveDraw.preWarn5")}
            </div>
          )}
          <div style={{
            position: "relative", width: 280, height: 280,
            borderRadius: "50%", overflow: "hidden",
            boxShadow: `inset 0 0 0 8px ${WOOD}, 0 20px 40px -10px rgba(0,0,0,0.3)`,
            transform: `rotate(${spinDeg}deg)`,
            transition: isDrawing
              ? "transform 12s cubic-bezier(0.15,0.85,0.2,1)"
              : isCompleted
              ? "transform 13s cubic-bezier(0.05,0.85,0.15,1)"
              : "transform 0.4s ease-out",
          }}>
            {segments.map((label: string, i: number) => {
              const angle = 360 / segments.length;
              const rot = i * angle;
              const colors = [BLUE, WOOD, GOLD, "#2a4d7d"];
              return (
                <div key={i} style={{
                  position: "absolute", inset: 0,
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((rot - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((rot - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((rot + angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((rot + angle - 90) * Math.PI / 180)}%)`,
                  background: colors[i % colors.length],
                  display: "grid", placeItems: "center",
                }}>
                  <span style={{
                    color: BEIGE, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    transform: `rotate(${rot + angle / 2}deg) translateY(-95px)`,
                    transformOrigin: "center",
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}>{label.slice(0, 12)}</span>
                </div>
              );
            })}
          </div>
          {/* Pointer */}
          <div style={{
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent", borderTop: `22px solid ${GOLD_BRIGHT}`,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            zIndex: 2,
          }} />
          <div style={{ marginTop: 12, fontSize: 11, color: WOOD, letterSpacing: "0.2em", fontWeight: 700 }}>
            {isOpen && t("liveDraw.autoSpin")}
            {isDrawing && t("liveDraw.spinning")}
            {isCompleted && draw?.winnerDisplayName && t("liveDraw.winnerAnnounced")}
            {isCompleted && !draw?.winnerDisplayName && t("liveDraw.noParticipants")}
          </div>

        </div>

        {/* Action panel */}
        <div style={{
          background: `${BLUE}`, color: BEIGE, borderRadius: 28, padding: 24,
          boxShadow: `0 30px 70px -20px rgba(15,39,71,0.5), inset 0 0 0 1px ${GOLD}44`,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD_BRIGHT, fontWeight: 800 }}>
            {t("liveDraw.enterDrawTitle")}
          </div>

          {entriesClosed && (
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: `${GOLD_BRIGHT}1f`, border: `1px solid ${GOLD_BRIGHT}55`,
              color: GOLD_BRIGHT, fontSize: 13, lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>
                ⏸ {t("liveDraw.entriesClosedTitle")}
              </div>
              <div style={{ color: `${BEIGE}cc`, fontSize: 12 }}>
                {t("liveDraw.entriesClosedBody", { mins: ENTRY_CUTOFF_MIN })}
              </div>
            </div>
          )}

          <div style={{ fontSize: 14, color: `${BEIGE}cc`, lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: t("liveDraw.ticketIntro") }}
          />
          <input
            type="text"
            placeholder={t("liveDraw.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            disabled={!canEnter}
            style={{
              padding: "12px 14px", borderRadius: 12, border: `1px solid ${GOLD}55`,
              background: `${BEIGE}11`, color: BEIGE, fontSize: 14, outline: "none",
              opacity: canEnter ? 1 : 0.55,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setTickets((t) => Math.max(1, t - 1))}
              disabled={!canEnter}
              style={btnSmall()}
              aria-label={t("liveDraw.minusAria")}
            >−</button>
            <div style={{
              flex: 1, textAlign: "center", padding: "10px 0",
              background: `${BEIGE}11`, borderRadius: 12, fontSize: 18, fontWeight: 800,
            }}
              dangerouslySetInnerHTML={{
                __html: t(tickets > 1 ? "liveDraw.ticketsLabelPlural" : "liveDraw.ticketsLabel", { n: tickets, cost: ticketCost }),
              }}
            />
            <button
              onClick={() => setTickets((t) => Math.min(50, t + 1))}
              disabled={!canEnter}
              style={btnSmall()}
              aria-label={t("liveDraw.plusAria")}
            >+</button>
          </div>
          <button
            disabled={!canEnter || !canAfford || enterMut.isPending}
            onClick={() => enterMut.mutate()}
            style={{
              padding: "16px", borderRadius: 14, border: "none",
              background: canEnter && canAfford
                ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`
                : `${BEIGE}22`,
              color: canEnter && canAfford ? WOOD : `${BEIGE}66`,
              fontSize: 16, fontWeight: 900, letterSpacing: "0.1em",
              cursor: canEnter && canAfford ? "pointer" : "not-allowed",
              boxShadow: canEnter && canAfford ? `0 10px 30px -10px ${GOLD_BRIGHT}` : "none",
              transition: "all 0.2s",
            }}
          >
            {!isOpen
              ? t("liveDraw.drawClosed")
              : entriesClosed
              ? t("liveDraw.entriesClosedShort")
              : !canAfford
              ? t("liveDraw.missingStars", { n: ticketCost - balance })
              : enterMut.isPending
              ? t("liveDraw.registering")
              : t("liveDraw.participate", { cost: ticketCost })}
          </button>
          <div style={{ fontSize: 11, color: `${BEIGE}88`, textAlign: "center" }}
            dangerouslySetInnerHTML={{ __html: t("liveDraw.yourBalance", { balance }) }}
          />

        </div>
      </div>
      )}



      {/* Admin-only test draw */}
      <AdminTestDrawGate onResult={() => qc.invalidateQueries({ queryKey: ["daily-draw"] })} />

      {/* Winners leaderboard */}
      <WinnersLeaderboard winners={winners ?? []} />

      {/* Fullscreen Stage — pre-show + spinning + winner celebration */}
      {mounted && stageOpen && !forceStageClosed && !preLaunch && typeof document !== "undefined" &&
        createPortal(
          <DrawStage
            phase={showWinner ? "celebrating" : isDrawing ? "spinning" : "pre-show"}
            spinDeg={spinDeg}
            segments={segments}
            countdown={cd}
            winnerName={draw?.winnerDisplayName ?? null}
            prizeUsd={draw?.prizeUsd ?? 0}
            seedHash={draw?.seedHash ?? null}
            onClose={() => {
              setShowWinner(false);
              setForceStageClosed(true);
            }}
          />,
          document.body,
        )
      }

      <style>{`
        @keyframes ldGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes ldPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.03); }
        }
        @keyframes ldRing5 {
          0%, 100% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.4), inset 0 0 0 1px rgba(110,68,42,0.13), 0 0 0 0 rgba(212,175,55,0.55); }
          50% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.4), inset 0 0 0 1px rgba(110,68,42,0.13), 0 0 28px 6px rgba(212,175,55,0.45); }
        }
        @keyframes ldRing1 {
          0%, 100% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.5), inset 0 0 0 1px rgba(110,68,42,0.2), 0 0 0 0 rgba(255,196,60,0.9); }
          50% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.5), inset 0 0 0 1px rgba(110,68,42,0.2), 0 0 44px 12px rgba(255,196,60,0.85); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ldPulse { 0%,100% { opacity: 1; transform: none; } }
          @keyframes ldRing5 { 0%,100% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.4), inset 0 0 0 1px rgba(110,68,42,0.13), 0 0 16px 2px rgba(212,175,55,0.4); } }
          @keyframes ldRing1 { 0%,100% { box-shadow: 0 30px 70px -20px rgba(59,36,23,0.5), inset 0 0 0 1px rgba(110,68,42,0.2), 0 0 24px 6px rgba(255,196,60,0.7); } }
        }
      `}</style>
    </section>
  );
}

function btnSmall(): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 12, border: `1px solid ${GOLD}66`,
    background: `${BEIGE}11`, color: BEIGE, fontSize: 22, cursor: "pointer", fontWeight: 700,
  };
}

function CountdownDigit({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 4 }}>
      <div style={{
        padding: "10px 16px", borderRadius: 14,
        background: "rgba(0,0,0,0.3)", border: `1px solid ${GOLD}55`,
        fontSize: 28, fontWeight: 900, color: GOLD_BRIGHT,
        fontVariantNumeric: "tabular-nums", minWidth: 64, textAlign: "center",
      }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: `${BEIGE}99` }}>{label}</div>
    </div>
  );
}

const SHOW_PREVIOUS_WINNERS = false;

function WinnersLeaderboard({ winners }: { winners: Array<{ drawDate: string; winnerDisplayName: string | null; prizeUsd: number; seedHash: string | null }> }) {
  const { t, i18n } = useTranslation();
  if (!SHOW_PREVIOUS_WINNERS) return null;
  return (
    <div style={{
      background: BEIGE, borderRadius: 24, padding: 24,
      boxShadow: `0 20px 50px -20px rgba(59,36,23,0.3), inset 0 0 0 1px ${WOOD}22`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.3em", color: WOOD, fontWeight: 800, marginBottom: 14 }}>
        {t("liveDraw.previousWinners")}
      </div>
      {winners.length === 0 ? (
        <div style={{ color: `${WOOD}99`, fontSize: 14, padding: "20px 0" }}>
          {t("liveDraw.noWinnersYet")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {winners.map((w, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
              padding: "10px 14px", borderRadius: 12,
              background: i === 0 ? `${GOLD}22` : `${WOOD}08`,
              border: i === 0 ? `1px solid ${GOLD}` : `1px solid transparent`,
            }}>
              <span style={{ fontSize: 11, color: `${WOOD}99`, fontWeight: 700, minWidth: 60 }}>
                {new Date(w.drawDate + "T12:00:00").toLocaleDateString(getLocale(i18n.language), { day: "2-digit", month: "short" })}
              </span>
              <span style={{ color: BLUE, fontWeight: 700, fontSize: 15 }}>
                {w.winnerDisplayName ?? "—"}
              </span>
              <span style={{ color: WOOD, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                ${w.prizeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function WinnerCelebration({ name, prizeUsd, seedHash, onClose }: {
  name: string; prizeUsd: number; seedHash: string | null; onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
        display: "grid", placeItems: "center", padding: 20,
        animation: "fadeIn 0.4s ease-out",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: `linear-gradient(135deg, ${BLUE}, #0f2747)`,
        border: `2px solid ${GOLD_BRIGHT}`, borderRadius: 32,
        padding: "48px 32px", maxWidth: 600, width: "100%",
        textAlign: "center", color: BEIGE,
        boxShadow: `0 0 80px ${GOLD_BRIGHT}88`,
        animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", color: GOLD_BRIGHT, fontWeight: 800, marginBottom: 10 }}>
          {t("liveDraw.winnerOfDay")}
        </div>

        <div style={{
          fontSize: "clamp(36px, 7vw, 64px)", fontWeight: 900, color: BEIGE,
          lineHeight: 1.1, marginBottom: 18, letterSpacing: "-0.02em",
          textShadow: `0 0 30px ${GOLD_BRIGHT}99`,
        }}>{name}</div>
        <div style={{ fontSize: 11, color: `${BEIGE}99`, letterSpacing: "0.2em" }}>{t("liveDraw.takesHome")}</div>
        <div style={{
          fontSize: "clamp(48px, 9vw, 88px)", fontWeight: 900,
          color: GOLD_BRIGHT, fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 40px ${GOLD_BRIGHT}`, lineHeight: 1, marginBottom: 24,
        }}>
          ${prizeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ fontSize: "0.4em", marginLeft: 8 }}>USD</span>
        </div>
        {seedHash && (
          <div style={{
            fontSize: 10, color: `${BEIGE}66`, fontFamily: "monospace",
            wordBreak: "break-all", padding: "8px 14px", background: "rgba(0,0,0,0.3)",
            borderRadius: 8, letterSpacing: "0.05em",
          }}>
            🔐 Hash: {seedHash.slice(0, 32)}...
          </div>
        )}
        <button onClick={onClose} style={{
          marginTop: 24, padding: "12px 32px", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
          color: WOOD, fontWeight: 900, fontSize: 14, letterSpacing: "0.2em", cursor: "pointer",
        }}>{t("liveDraw.closeBtn")}</button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// AdminTestDrawPanel moved to ./AdminTestDrawPanel.tsx and lazy-loaded above.

// ===================== Fullscreen Stage =====================
function DrawStage({
  phase, spinDeg, segments, countdown, winnerName, prizeUsd, seedHash, onClose,
}: {
  phase: "pre-show" | "spinning" | "celebrating";
  spinDeg: number;
  segments: string[];
  countdown: { hh: string; mm: string; ss: string; ms: number };
  winnerName: string | null;
  prizeUsd: number;
  seedHash: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const wheelSize = "min(78vmin, 620px)";

  const isCelebrating = phase === "celebrating";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("fullscreenDraw.ariaLabel")}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "radial-gradient(ellipse at center, rgba(15,39,71,0.95) 0%, rgba(0,0,0,0.97) 70%)",
        backdropFilter: "blur(14px)",
        display: "grid", placeItems: "center", padding: "max(16px, 4vh) 16px",
        animation: "stageFade 0.5s ease-out",
        overflow: "auto",
      }}
    >
      {/* Close button only after celebration begins */}
      {isCelebrating && (
        <button
          onClick={onClose}
          aria-label={t("fullscreenDraw.close")}
          style={{
            position: "absolute", top: 18, right: 18, zIndex: 2,
            width: 44, height: 44, borderRadius: "50%", border: `1px solid ${GOLD}66`,
            background: "rgba(0,0,0,0.5)", color: BEIGE, fontSize: 20, cursor: "pointer",
          }}
        >×</button>
      )}

      <div style={{
        display: "grid", placeItems: "center", gap: "clamp(16px, 3vh, 28px)",
        textAlign: "center", color: BEIGE, maxWidth: 980, width: "100%",
      }}>
        {/* Header / banner */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{
            fontSize: "clamp(11px, 1.4vw, 14px)", letterSpacing: "0.45em",
            color: GOLD_BRIGHT, fontWeight: 800,
          }}>
            {phase === "pre-show" && t("liveDraw.stageEyebrowPre")}
            {phase === "spinning" && t("liveDraw.stageEyebrowSpin")}
            {phase === "celebrating" && t("liveDraw.stageEyebrowWin")}

          </div>

          {phase === "pre-show" && (
            <div style={{
              fontSize: "clamp(72px, 16vw, 180px)", fontWeight: 900,
              fontVariantNumeric: "tabular-nums", color: BEIGE,
              textShadow: `0 0 60px ${GOLD_BRIGHT}, 0 0 120px ${GOLD_BRIGHT}88`,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              animation: "stageBlink 1s ease-in-out infinite",
            }}>
              {countdown.mm}:{countdown.ss}
            </div>
          )}

          {isCelebrating && winnerName && (
            <>
              <div style={{
                fontSize: "clamp(40px, 9vw, 110px)", fontWeight: 900,
                color: BEIGE, lineHeight: 1.05, letterSpacing: "-0.02em",
                textShadow: `0 0 50px ${GOLD_BRIGHT}`,
                animation: "winnerIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}>{winnerName}</div>
              <div style={{ fontSize: 12, letterSpacing: "0.3em", color: `${BEIGE}99`, marginTop: 6 }}>
                {t("liveDraw.takesHome")}
              </div>

              <div style={{
                fontSize: "clamp(44px, 10vw, 110px)", fontWeight: 900,
                color: GOLD_BRIGHT, fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 60px ${GOLD_BRIGHT}`, lineHeight: 1,
              }}>
                ${prizeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={{ fontSize: "0.4em", marginLeft: 10 }}>USD</span>
              </div>
            </>
          )}
        </div>

        {/* Giant wheel — hidden during celebration to leave room for the name */}
        {!isCelebrating && (
          <div style={{
            position: "relative",
            width: wheelSize, height: wheelSize,
            display: "grid", placeItems: "center",
          }}>
            <div style={{
              position: "relative", width: "100%", height: "100%",
              borderRadius: "50%", overflow: "hidden",
              boxShadow: `inset 0 0 0 14px ${WOOD}, 0 30px 80px -20px rgba(0,0,0,0.7), 0 0 80px ${GOLD_BRIGHT}55`,
              transform: `rotate(${spinDeg}deg)`,
              transition: phase === "spinning"
                ? "transform 12s cubic-bezier(0.05,0.85,0.15,1)"
                : "transform 0.4s ease-out",
              background: BEIGE,
            }}>
              {segments.map((label, i) => {
                const angle = 360 / segments.length;
                const rot = i * angle;
                const colors = [BLUE, WOOD, GOLD, "#2a4d7d"];
                return (
                  <div key={i} style={{
                    position: "absolute", inset: 0,
                    clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((rot - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((rot - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((rot + angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((rot + angle - 90) * Math.PI / 180)}%)`,
                    background: colors[i % colors.length],
                    display: "grid", placeItems: "center",
                  }}>
                    <span style={{
                      color: BEIGE, fontSize: "clamp(13px, 1.8vw, 20px)", fontWeight: 800, letterSpacing: "0.08em",
                      transform: `rotate(${rot + angle / 2}deg) translateY(calc(${wheelSize} * -0.36))`,
                      transformOrigin: "center",
                      textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    }}>{label.slice(0, 14)}</span>
                  </div>
                );
              })}
            </div>
            {/* Pointer */}
            <div style={{
              position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
              width: 0, height: 0, borderLeft: "22px solid transparent",
              borderRight: "22px solid transparent", borderTop: `34px solid ${GOLD_BRIGHT}`,
              filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 12px ${GOLD_BRIGHT})`,
              zIndex: 2,
            }} />
            {/* Center hub */}
            <div style={{
              position: "absolute", width: "12%", height: "12%", borderRadius: "50%",
              background: `radial-gradient(circle, ${GOLD_BRIGHT}, ${GOLD})`,
              boxShadow: `0 0 30px ${GOLD_BRIGHT}, inset 0 0 0 4px ${WOOD}`,
            }} />
          </div>
        )}

        {isCelebrating && seedHash && (
          <div style={{
            fontSize: 11, color: `${BEIGE}77`, fontFamily: "monospace",
            wordBreak: "break-all", padding: "10px 16px", background: "rgba(0,0,0,0.4)",
            borderRadius: 10, maxWidth: 600,
          }}>
            {t("liveDraw.transparencyHash", { hash: seedHash.slice(0, 40) })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes stageFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes winnerIn {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes stageBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.97); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes stageBlink { 0%, 100% { opacity: 1; transform: none; } }
        }
      `}</style>
    </div>
  );
}

