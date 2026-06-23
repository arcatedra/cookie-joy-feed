import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

type Phase = "countdown" | "spinning" | "winner" | "challenge" | "done";

type ApiResult = {
  ok?: boolean;
  simulated?: boolean;
  simulatedWinner?: { display_name: string; prize_usd: number; draw_date: string } | null;
  result?:
    | { status?: string; winner_display_name?: string | null; prize_usd?: number; draw_date?: string }
    | Array<{ status?: string; winner_display_name?: string | null; prize_usd?: number; draw_date?: string }>;
};

const BRAND_COLORS = ["#c9a36b", "#e8c98a", "#f3ead8", "#8a5a2b", "#1e3a5f"];

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 120,
    gravity: 0.7,
    decay: 0.94,
    startVelocity: 32,
    colors: BRAND_COLORS,
  };
  confetti({ ...defaults, particleCount: 80, scalar: 1.1, origin: { x: 0.5, y: 0.3 } });
  setTimeout(
    () => confetti({ ...defaults, particleCount: 60, scalar: 0.9, origin: { x: 0.2, y: 0.4 } }),
    250,
  );
  setTimeout(
    () => confetti({ ...defaults, particleCount: 60, scalar: 0.9, origin: { x: 0.8, y: 0.4 } }),
    500,
  );
}

export function FullscreenDrawExperience({
  open,
  onClose,
  onWinnerInvalidate,
}: {
  open: boolean;
  onClose: () => void;
  onWinnerInvalidate?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [spinDeg, setSpinDeg] = useState(0);
  const [winner, setWinner] = useState<{ name: string; prize: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Skill challenge state
  const challenge = useMemo(() => {
    const a = 10 + Math.floor(Math.random() * 15);
    const b = 5 + Math.floor(Math.random() * 15);
    return { a, b, answer: a + b };
  }, [open]);
  const [challengeInput, setChallengeInput] = useState("");
  const [challengeTime, setChallengeTime] = useState(20);
  const [challengeStatus, setChallengeStatus] = useState<"idle" | "ok" | "fail">("idle");

  const apiPromiseRef = useRef<Promise<ApiResult> | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset on open + kick off the show
  useEffect(() => {
    if (!open) return;
    setPhase("countdown");
    setCountdown(3);
    setSpinDeg(0);
    setWinner(null);
    setErrorMsg(null);
    setChallengeInput("");
    setChallengeTime(20);
    setChallengeStatus("idle");

    // Fire API in parallel with countdown
    apiPromiseRef.current = (async () => {
      const res = await fetch("/api/public/hooks/run-daily-draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ test_mode: true }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${res.status} → ${text.slice(0, 200)}`);
      try {
        return JSON.parse(text) as ApiResult;
      } catch {
        return {} as ApiResult;
      }
    })();
  }, [open]);

  // Countdown 3 → 2 → 1 → spin
  useEffect(() => {
    if (!open || phase !== "countdown") return;
    vibrate(40);
    if (countdown <= 0) {
      setPhase("spinning");
      // Start spinning (long rotation)
      const totalSpin = 360 * 8 + Math.floor(Math.random() * 360);
      requestAnimationFrame(() => setSpinDeg(totalSpin));
      vibrate([20, 30, 20, 30, 20, 30, 20, 30, 20, 30, 20]);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [open, phase, countdown]);

  // After spin animation, resolve winner
  useEffect(() => {
    if (!open || phase !== "spinning") return;
    const t = setTimeout(async () => {
      try {
        const data = (await apiPromiseRef.current) ?? {};
        const row = Array.isArray(data.result) ? data.result[0] : data.result;
        const name = data.simulatedWinner?.display_name ?? row?.winner_display_name ?? "Participante";
        const prize = Number(data.simulatedWinner?.prize_usd ?? row?.prize_usd ?? 0);
        setWinner({ name, prize });
        setPhase("winner");
        fireConfetti();
        vibrate([60, 30, 120]);
        onWinnerInvalidate?.();
      } catch (e) {
        setErrorMsg(String(e instanceof Error ? e.message : e));
        setPhase("done");
        toast.error("Error al ejecutar el sorteo");
      }
    }, 4800);
    return () => clearTimeout(t);
  }, [open, phase, onWinnerInvalidate]);

  // Auto-advance to challenge after celebration
  useEffect(() => {
    if (phase !== "winner") return;
    const t = setTimeout(() => setPhase("challenge"), 3200);
    return () => clearTimeout(t);
  }, [phase]);

  // Challenge timer
  useEffect(() => {
    if (phase !== "challenge" || challengeStatus !== "idle") return;
    if (challengeTime <= 0) {
      setChallengeStatus("fail");
      return;
    }
    const t = setTimeout(() => setChallengeTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, challengeTime, challengeStatus]);

  if (!open) return null;

  const segments = 12;
  const segmentAngle = 360 / segments;

  const submitChallenge = () => {
    if (Number(challengeInput.trim()) === challenge.answer) {
      setChallengeStatus("ok");
      fireConfetti();
      vibrate(80);
    } else {
      setChallengeStatus("fail");
      vibrate([100, 50, 100]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sorteo en vivo"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(20px) saturate(140%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 4vw, 40px)",
        overflow: "hidden",
        animation: "fade-in 0.3s ease-out",
      }}
    >
      {/* Test mode badge */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "6px 14px",
          background: "linear-gradient(90deg, #fde68a, #fbbf24)",
          color: "#3b2417",
          border: "2px solid #b45309",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        🧪 Modo prueba
      </div>

      {/* Close button (always available except mid-spin) */}
      {phase !== "spinning" && phase !== "countdown" && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(243,234,216,0.3)",
            background: "rgba(15,23,42,0.6)",
            color: "#f3ead8",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      )}

      {/* Layout: wheel + side panels (desktop), stacked (mobile) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          gap: 24,
          width: "100%",
          maxWidth: 1100,
          alignItems: "center",
          justifyItems: "center",
        }}
        className="origen-draw-grid"
      >
        {/* Wheel area */}
        <div
          style={{
            position: "relative",
            width: "min(80vw, 500px)",
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
          }}
        >
          {/* Glow ring */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(201,163,107,0.45), transparent 70%)",
              filter: "blur(20px)",
              animation:
                phase === "spinning"
                  ? "origen-glow-pulse 1.2s ease-in-out infinite"
                  : "none",
              opacity: phase === "winner" ? 1 : 0.7,
            }}
          />

          {/* Pointer */}
          <div
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: "26px solid #c9a36b",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.6))",
              zIndex: 3,
            }}
          />

          {/* Wheel */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "6px solid #c9a36b",
              boxShadow:
                "0 0 0 4px rgba(243,234,216,0.15), 0 30px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.4)",
              overflow: "hidden",
              background: "#1e3a5f",
              transform: `rotate(${spinDeg}deg)`,
              transition:
                phase === "spinning"
                  ? "transform 4.6s cubic-bezier(0.17, 0.67, 0.16, 0.99)"
                  : "none",
              opacity: phase === "winner" || phase === "challenge" ? 0 : 1,
              ...(phase === "winner" || phase === "challenge"
                ? { transform: `rotate(${spinDeg}deg) scale(0.9)`, transition: "all 0.6s ease" }
                : {}),
            }}
          >
            {Array.from({ length: segments }).map((_, i) => {
              const color = i % 2 === 0 ? "#1e3a5f" : "#0f2540";
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: `polygon(50% 50%, ${50 + 50 * Math.sin((i * segmentAngle * Math.PI) / 180)}% ${
                      50 - 50 * Math.cos((i * segmentAngle * Math.PI) / 180)
                    }%, ${50 + 50 * Math.sin(((i + 1) * segmentAngle * Math.PI) / 180)}% ${
                      50 - 50 * Math.cos(((i + 1) * segmentAngle * Math.PI) / 180)
                    }%)`,
                    background: color,
                    borderRight: "1px solid rgba(201,163,107,0.3)",
                  }}
                />
              );
            })}
            {/* Center hub */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 60,
                height: 60,
                marginTop: -30,
                marginLeft: -30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #c9a36b, #8a5a2b)",
                border: "3px solid #f3ead8",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                zIndex: 2,
              }}
            />
          </div>

          {/* Countdown overlay */}
          {phase === "countdown" && (
            <div
              key={countdown}
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "#f3ead8",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 900,
                fontSize: "clamp(120px, 30vw, 240px)",
                textShadow: "0 0 40px rgba(201,163,107,0.8), 0 0 80px rgba(201,163,107,0.4)",
                animation: "origen-count-pop 0.8s ease-out",
                zIndex: 4,
              }}
            >
              {countdown > 0 ? countdown : "¡GIRA!"}
            </div>
          )}
        </div>
      </div>

      {/* Winner celebration card */}
      {phase === "winner" && winner && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            animation: "fade-in 0.5s ease-out",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              padding: "clamp(28px, 5vw, 48px)",
              background: "linear-gradient(135deg, #f3ead8, #e8c98a)",
              border: "3px solid #c9a36b",
              borderRadius: 24,
              textAlign: "center",
              boxShadow: "0 30px 90px rgba(0,0,0,0.6), 0 0 60px rgba(201,163,107,0.4)",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: 4, color: "#8a5a2b", fontWeight: 700 }}>
              GANADOR DEL SORTEO
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(28px, 6vw, 44px)",
                fontWeight: 900,
                color: "#3b2417",
                lineHeight: 1.1,
              }}
            >
              🏆 {winner.name}
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: "clamp(36px, 8vw, 56px)",
                fontWeight: 900,
                color: "#1e3a5f",
                fontFamily: "Georgia, serif",
              }}
            >
              ${winner.prize.toFixed(2)}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#8a5a2b" }}>
              en estrellas ORIGEN ⭐
            </div>
          </div>
        </div>
      )}

      {/* Skill challenge */}
      {phase === "challenge" && winner && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            animation: "fade-in 0.4s ease-out",
          }}
        >
          <div
            style={{
              maxWidth: 460,
              width: "100%",
              padding: "clamp(24px, 5vw, 36px)",
              background: "rgba(15,23,42,0.95)",
              border: "2px solid #c9a36b",
              borderRadius: 20,
              textAlign: "center",
              color: "#f3ead8",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 3, color: "#c9a36b", fontWeight: 700 }}>
              VALIDACIÓN LEGAL — RETO DE HABILIDAD
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: "Georgia, serif",
                fontSize: "clamp(28px, 6vw, 40px)",
                fontWeight: 800,
              }}
            >
              ¿Cuánto es {challenge.a} + {challenge.b}?
            </div>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
              Tiempo restante:{" "}
              <span style={{ color: challengeTime <= 2 ? "#ef4444" : "#c9a36b", fontWeight: 800 }}>
                {Math.max(0, challengeTime)}s
              </span>
            </div>

            {challengeStatus === "idle" && (
              <>
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitChallenge()}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    padding: "14px 18px",
                    fontSize: 22,
                    textAlign: "center",
                    fontWeight: 800,
                    background: "rgba(243,234,216,0.08)",
                    color: "#f3ead8",
                    border: "2px solid #c9a36b",
                    borderRadius: 12,
                    outline: "none",
                  }}
                  placeholder="Tu respuesta"
                />
                <button
                  type="button"
                  onClick={submitChallenge}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "12px 18px",
                    background: "#1e3a5f",
                    color: "#f3ead8",
                    border: "1px solid #c9a36b",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Confirmar
                </button>
              </>
            )}

            {challengeStatus === "ok" && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 18, color: "#86efac", fontWeight: 800 }}>
                  ✅ ¡Correcto! Premio validado.
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    marginTop: 18,
                    width: "100%",
                    padding: "14px 18px",
                    background: "#1e3a5f",
                    color: "#f3ead8",
                    border: "1px solid #c9a36b",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Cerrar y volver a la tienda
                </button>
              </div>
            )}

            {challengeStatus === "fail" && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 16, color: "#fca5a5", fontWeight: 700 }}>
                  ⛔ Respuesta incorrecta o tiempo agotado.
                  <br />
                  <span style={{ fontSize: 13, opacity: 0.8 }}>
                    La respuesta era {challenge.answer}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    marginTop: 18,
                    width: "100%",
                    padding: "14px 18px",
                    background: "#1e3a5f",
                    color: "#f3ead8",
                    border: "1px solid #c9a36b",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error fallback */}
      {phase === "done" && errorMsg && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              padding: 28,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid #ef4444",
              borderRadius: 16,
              color: "#f3ead8",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#fca5a5", fontWeight: 800, marginBottom: 10 }}>
              Error al ejecutar el sorteo
            </div>
            <pre
              style={{
                fontSize: 11,
                textAlign: "left",
                background: "rgba(0,0,0,0.4)",
                padding: 10,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              {errorMsg}
            </pre>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 14,
                padding: "10px 18px",
                background: "#1e3a5f",
                color: "#f3ead8",
                border: "1px solid #c9a36b",
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes origen-glow-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes origen-count-pop {
          0% { transform: scale(0.4); opacity: 0; }
          40% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
