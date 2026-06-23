import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getPrizePool } from "@/lib/stars-checkout.functions";


const BEIGE = "#f3ead8";
const GOLD = "#c9a36b";
const GOLD_BRIGHT = "#e6c181";
const WOOD = "#3b2417";
const BLUE = "#1e3a5f";

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function PrizePoolCounter() {
  const { t } = useTranslation();

  const fetchPool = useServerFn(getPrizePool);
  const { data } = useQuery({
    queryKey: ["prize-pool"],
    queryFn: () => fetchPool(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const target = data?.total_pool_usd ?? 0;
  const contributions = data?.total_contributions ?? 0;
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutExpo(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return (
    <div
      style={{
        position: "relative",
        background: `linear-gradient(135deg, ${BLUE} 0%, #0f2747 60%, #1a3358 100%)`,
        borderRadius: 28,
        padding: "32px clamp(20px,4vw,40px)",
        overflow: "hidden",
        boxShadow: `0 30px 70px -20px rgba(15,39,71,0.6), inset 0 0 0 1px ${GOLD}33`,
      }}
    >
      {/* Glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -100,
          background: `radial-gradient(circle at 50% 0%, ${GOLD_BRIGHT}33 0%, transparent 55%)`,
          pointerEvents: "none",
          animation: "ppGlow 4s ease-in-out infinite",
        }}
      />
      <div style={{ position: "relative", display: "grid", placeItems: "center", gap: 8 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.4em",
            color: GOLD_BRIGHT,
            fontWeight: 700,
          }}
        >
          {t("prizePool.eyebrow")}
        </div>

        <div
          style={{
            fontSize: "clamp(40px, 8vw, 72px)",
            fontWeight: 900,
            color: BEIGE,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            textShadow: `0 0 30px ${GOLD_BRIGHT}66`,
            lineHeight: 1.05,
          }}
        >
          $
          {display.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span style={{ fontSize: "0.4em", marginLeft: 8, color: GOLD_BRIGHT }}>USD</span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: `${BEIGE}cc`,
            letterSpacing: "0.15em",
            marginTop: 4,
          }}
        >
          {t("prizePool.contributions", { count: contributions })}
        </div>

      </div>
      <style>{`
        @keyframes ppGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 12,
          right: 18,
          fontSize: 9,
          color: `${BEIGE}66`,
          letterSpacing: "0.2em",
        }}
      >
        {t("prizePool.updatedLive")}
      </div>
      <div aria-hidden style={{ display: "none", color: WOOD }} />

    </div>
  );
}
