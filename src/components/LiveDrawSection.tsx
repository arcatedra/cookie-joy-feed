import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { getTodayDraw, getRecentWinners, enterDailyDraw } from "@/lib/daily-draw.functions";
import { checkIsAdmin, triggerTestDraw } from "@/lib/admin-draw.functions";

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

  // Animation orchestrator: when status flips to completed, spin + confetti
  const [spinDeg, setSpinDeg] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draw) return;
    const prev = lastStatusRef.current;
    if (draw.status === "drawing" && prev !== "drawing") {
      // start dramatic spin
      setSpinDeg((d) => d + 360 * 6 + Math.floor(Math.random() * 360));
    }
    if (draw.status === "completed" && prev !== "completed") {
      // finalize spin + celebrate
      setSpinDeg((d) => d + 360 * 8 + Math.floor(Math.random() * 360));
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
      toast.success(`✓ ${res.ticketsAdded} boleto(s) registrado(s) — saldo: ${res.newBalance}⭐`);
      qc.invalidateQueries({ queryKey: ["daily-draw"] });
      qc.invalidateQueries({ queryKey: ["roulette-state"] });
    },
    onError: () => toast.error("Error al registrar boleto"),
  });

  const ticketCost = tickets * 10;
  const canAfford = balance >= ticketCost;

  const segments = useMemo(() => {
    const labels: string[] = (winners ?? [])
      .slice(0, 8)
      .map((w: { winnerDisplayName: string | null }) => w.winnerDisplayName ?? "?");
    while (labels.length < 8) labels.push("ORIGEN");
    return labels;
  }, [winners]);

  const status = draw?.status ?? "open";
  const isOpen = status === "open";
  const isDrawing = status === "drawing";
  const isCompleted = status === "completed";

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
        <div style={{ position: "relative", display: "grid", placeItems: "center", gap: 6, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.4em", color: GOLD_BRIGHT, fontWeight: 800 }}>
            {isCompleted ? "★ SORTEO DEL DÍA — GANADOR ★" : isDrawing ? "🔴 EN VIVO · GIRANDO" : "★ BOTE DE HOY · LIVE DRAW 8:00 PM ★"}
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
            <div style={{ display: "flex", gap: 18, marginTop: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <CountdownDigit label="HORAS" value={cd.hh} />
              <CountdownDigit label="MIN" value={cd.mm} />
              <CountdownDigit label="SEG" value={cd.ss} />
            </div>
          )}
          <div style={{ fontSize: 12, color: `${BEIGE}cc`, letterSpacing: "0.15em", marginTop: 6 }}>
            {draw?.entrantsTotal ?? 0} participantes · {draw?.ticketsTotal ?? 0} boletos
            {draw?.rolledOverFrom ? <> · Acumulado desde {new Date(draw.rolledOverFrom).toLocaleDateString()}</> : null}
          </div>
        </div>
      </div>

      {/* Roulette + Action */}
      <div style={{
        display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)",
        gap: 24, alignItems: "stretch",
      }}>
        {/* Roulette */}
        <div style={{
          background: BEIGE, borderRadius: 28, padding: 24,
          boxShadow: `0 30px 70px -20px rgba(59,36,23,0.4), inset 0 0 0 1px ${WOOD}22`,
          display: "grid", placeItems: "center", minHeight: 360, position: "relative",
        }}>
          <div style={{
            position: "relative", width: 280, height: 280,
            borderRadius: "50%", overflow: "hidden",
            boxShadow: `inset 0 0 0 8px ${WOOD}, 0 20px 40px -10px rgba(0,0,0,0.3)`,
            transform: `rotate(${spinDeg}deg)`,
            transition: isDrawing
              ? "transform 6s cubic-bezier(0.15,0.8,0.25,1)"
              : isCompleted
              ? "transform 7s cubic-bezier(0.05,0.85,0.15,1)"
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
            {isOpen && "🤖 GIRA AUTOMÁTICAMENTE 8:00 PM ET"}
            {isDrawing && "🔴 SORTEANDO..."}
            {isCompleted && draw?.winnerDisplayName && "🏆 GANADOR ANUNCIADO"}
            {isCompleted && !draw?.winnerDisplayName && "Sin participantes — Bote acumulado"}
          </div>
        </div>

        {/* Action panel */}
        <div style={{
          background: `${BLUE}`, color: BEIGE, borderRadius: 28, padding: 24,
          boxShadow: `0 30px 70px -20px rgba(15,39,71,0.5), inset 0 0 0 1px ${GOLD}44`,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: GOLD_BRIGHT, fontWeight: 800 }}>
            INSCRIBIRSE AL SORTEO
          </div>
          <div style={{ fontSize: 14, color: `${BEIGE}cc`, lineHeight: 1.5 }}>
            1 boleto = <strong style={{ color: GOLD_BRIGHT }}>10 ⭐</strong> · Mientras más boletos, más chances.
          </div>
          <input
            type="text"
            placeholder="Tu nombre (visible si ganas)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            style={{
              padding: "12px 14px", borderRadius: 12, border: `1px solid ${GOLD}55`,
              background: `${BEIGE}11`, color: BEIGE, fontSize: 14, outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setTickets((t) => Math.max(1, t - 1))}
              style={btnSmall()}
              aria-label="menos"
            >−</button>
            <div style={{
              flex: 1, textAlign: "center", padding: "10px 0",
              background: `${BEIGE}11`, borderRadius: 12, fontSize: 18, fontWeight: 800,
            }}>
              {tickets} boleto{tickets > 1 ? "s" : ""} · <span style={{ color: GOLD_BRIGHT }}>{ticketCost}⭐</span>
            </div>
            <button
              onClick={() => setTickets((t) => Math.min(50, t + 1))}
              style={btnSmall()}
              aria-label="más"
            >+</button>
          </div>
          <button
            disabled={!isOpen || !canAfford || enterMut.isPending}
            onClick={() => enterMut.mutate()}
            style={{
              padding: "16px", borderRadius: 14, border: "none",
              background: isOpen && canAfford
                ? `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`
                : `${BEIGE}22`,
              color: isOpen && canAfford ? WOOD : `${BEIGE}66`,
              fontSize: 16, fontWeight: 900, letterSpacing: "0.1em",
              cursor: isOpen && canAfford ? "pointer" : "not-allowed",
              boxShadow: isOpen && canAfford ? `0 10px 30px -10px ${GOLD_BRIGHT}` : "none",
              transition: "all 0.2s",
            }}
          >
            {!isOpen ? "SORTEO CERRADO" : !canAfford ? `FALTAN ${ticketCost - balance}⭐` : enterMut.isPending ? "REGISTRANDO..." : `PARTICIPAR (${ticketCost}⭐)`}
          </button>
          <div style={{ fontSize: 11, color: `${BEIGE}88`, textAlign: "center" }}>
            Tu saldo: <strong style={{ color: GOLD_BRIGHT }}>{balance}⭐</strong>
          </div>
        </div>
      </div>

      {/* Admin-only test draw */}
      <AdminTestDrawPanel onResult={() => qc.invalidateQueries({ queryKey: ["daily-draw"] })} />

      {/* Winners leaderboard */}
      <WinnersLeaderboard winners={winners ?? []} />

      {/* Winner celebration modal */}
      {showWinner && draw?.winnerDisplayName && (
        <WinnerCelebration
          name={draw.winnerDisplayName}
          prizeUsd={draw.prizeUsd}
          seedHash={draw.seedHash}
          onClose={() => setShowWinner(false)}
        />
      )}

      <style>{`
        @keyframes ldGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
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

function WinnersLeaderboard({ winners }: { winners: Array<{ drawDate: string; winnerDisplayName: string | null; prizeUsd: number; seedHash: string | null }> }) {
  return (
    <div style={{
      background: BEIGE, borderRadius: 24, padding: 24,
      boxShadow: `0 20px 50px -20px rgba(59,36,23,0.3), inset 0 0 0 1px ${WOOD}22`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.3em", color: WOOD, fontWeight: 800, marginBottom: 14 }}>
        🏆 GANADORES ANTERIORES
      </div>
      {winners.length === 0 ? (
        <div style={{ color: `${WOOD}99`, fontSize: 14, padding: "20px 0" }}>
          Aún no hay sorteos completados. ¡Tú puedes ser el primero!
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
                {new Date(w.drawDate).toLocaleDateString("es", { day: "2-digit", month: "short" })}
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
          ¡GANADOR DEL DÍA!
        </div>
        <div style={{
          fontSize: "clamp(36px, 7vw, 64px)", fontWeight: 900, color: BEIGE,
          lineHeight: 1.1, marginBottom: 18, letterSpacing: "-0.02em",
          textShadow: `0 0 30px ${GOLD_BRIGHT}99`,
        }}>{name}</div>
        <div style={{ fontSize: 11, color: `${BEIGE}99`, letterSpacing: "0.2em" }}>SE LLEVA</div>
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
        }}>CERRAR</button>
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

function AdminTestDrawPanel({ onResult }: { onResult: () => void }) {
  const checkAdminFn = useServerFn(checkIsAdmin);
  const triggerFn = useServerFn(triggerTestDraw);

  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdminFn().catch(() => ({ isAdmin: false })),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const [lastResult, setLastResult] = useState<{
    status: string;
    winnerDisplayName: string | null;
    prizeUsd: number;
    seedHash: string | null;
    drawDate: string;
  } | null>(null);

  const mut = useMutation({
    mutationFn: async () => triggerFn(),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLastResult({
        status: res.status,
        winnerDisplayName: res.winnerDisplayName,
        prizeUsd: res.prizeUsd,
        seedHash: res.seedHash,
        drawDate: res.drawDate,
      });
      toast.success(`Sorteo ejecutado: ${res.status}`);
      onResult();
    },
    onError: () => toast.error("Error al ejecutar sorteo de prueba"),
  });

  if (!adminCheck?.isAdmin) return null;

  const isAlreadyDrawn = lastResult && lastResult.status !== "open";

  return (
    <div style={{
      background: `${WOOD}`, color: BEIGE, borderRadius: 20, padding: 20,
      border: `2px dashed ${GOLD_BRIGHT}`,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", color: GOLD_BRIGHT, fontWeight: 800 }}>
            🛡️ PANEL ADMIN
          </div>
          <div style={{ fontSize: 13, color: `${BEIGE}cc`, marginTop: 4 }}>
            Ejecutar el sorteo manualmente (idempotente — no repite si ya hay un ganador hoy).
          </div>
        </div>
        <button
          disabled={mut.isPending}
          onClick={() => {
            if (!confirm("¿Ejecutar el sorteo de HOY ahora? Esta acción es real y selecciona un ganador.")) return;
            mut.mutate();
          }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            color: WOOD, fontWeight: 900, fontSize: 13, letterSpacing: "0.15em",
            cursor: mut.isPending ? "wait" : "pointer", whiteSpace: "nowrap",
          }}
        >
          {mut.isPending ? "EJECUTANDO..." : "🎰 PROBAR SORTEO"}
        </button>
      </div>

      {lastResult && (
        <div style={{
          padding: 14, borderRadius: 12, background: "rgba(0,0,0,0.35)",
          display: "grid", gap: 8, fontSize: 13,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: `${BEIGE}99` }}>Estado:</span>
            <strong style={{ color: GOLD_BRIGHT, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              {lastResult.status}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>Fecha:</span>
            <span>{lastResult.drawDate}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>Ganador:</span>
            <strong style={{ color: BEIGE }}>{lastResult.winnerDisplayName ?? "— (sin participantes)"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>Premio:</span>
            <strong style={{ color: GOLD_BRIGHT, fontVariantNumeric: "tabular-nums" }}>
              ${lastResult.prizeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>
          {lastResult.seedHash && (
            <div style={{ fontSize: 10, fontFamily: "monospace", color: `${BEIGE}77`, wordBreak: "break-all" }}>
              🔐 {lastResult.seedHash}
            </div>
          )}
          {isAlreadyDrawn && (
            <div style={{ fontSize: 11, color: `${GOLD_BRIGHT}cc`, fontStyle: "italic" }}>
              ℹ️ El sorteo ya está marcado como completado. Volver a ejecutar devolverá el mismo resultado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
