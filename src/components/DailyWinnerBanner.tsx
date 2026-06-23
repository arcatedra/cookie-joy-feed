import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getWinnerAnnouncements } from "@/lib/daily-draw.functions";
import { getLocale } from "@/i18n";

const BEIGE = "#f3ead8";
const BLUE = "#1e3a5f";
const WOOD = "#3b2417";
const GOLD = "#c9a36b";
const GOLD_BRIGHT = "#e6c181";

export function DailyWinnerBanner() {
  const { t, i18n } = useTranslation();
  const fetchFn = useServerFn(getWinnerAnnouncements);
  const { data } = useQuery({
    queryKey: ["winner-announcements"],
    queryFn: () => fetchFn(),
    refetchInterval: 60_000,
  });

  const latest = data?.[0];
  if (!latest) return null;

  const date = new Date(latest.drawDate).toLocaleDateString(getLocale(i18n.language), {
    day: "2-digit",
    month: "long",
  });

  return (
    <section
      aria-label={t("dailyWinner.aria")}
      style={{
        position: "relative",
        margin: "0 auto 20px",
        maxWidth: 1100,
        padding: "0 16px",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          background: `linear-gradient(135deg, ${BLUE} 0%, #0f2747 60%, #1a3358 100%)`,
          boxShadow: `0 25px 60px -25px rgba(15,39,71,0.7), inset 0 0 0 1px ${GOLD}55`,
          color: BEIGE,
          padding: "20px clamp(18px, 4vw, 32px)",
          animation: "winnerPulse 3.5s ease-in-out infinite",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -100,
            background: `radial-gradient(circle at 80% 0%, ${GOLD_BRIGHT}44 0%, transparent 55%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              boxShadow: `0 0 30px ${GOLD_BRIGHT}88`,
            }}
          >
            🏆
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                color: GOLD_BRIGHT,
                fontWeight: 800,
              }}
            >
              {t("dailyWinner.eyebrow", { date: date.toUpperCase() })}
            </div>
            <div
              style={{
                fontSize: "clamp(20px, 3.8vw, 30px)",
                fontWeight: 900,
                color: BEIGE,
                lineHeight: 1.15,
                marginTop: 2,
                textShadow: `0 0 20px ${GOLD_BRIGHT}55`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {latest.winnerDisplayName}
            </div>
            <div
              style={{
                fontSize: 13,
                color: `${BEIGE}cc`,
                marginTop: 2,
              }}
            >
              {t("dailyWinner.takesHome")}
              <strong
                style={{
                  color: GOLD_BRIGHT,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${latest.prizeUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </strong>
            </div>
          </div>
          <Link
            to="/ruleta"
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
              color: WOOD,
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: "0.18em",
              textDecoration: "none",
              boxShadow: `0 10px 25px -10px ${GOLD_BRIGHT}`,
              whiteSpace: "nowrap",
            }}
          >
            {t("dailyWinner.playToday")}
          </Link>
        </div>
      </div>
      <style>{`
        @keyframes winnerPulse {
          0%, 100% { box-shadow: 0 25px 60px -25px rgba(15,39,71,0.7), inset 0 0 0 1px ${GOLD}55; }
          50% { box-shadow: 0 25px 70px -20px ${GOLD_BRIGHT}55, inset 0 0 0 1px ${GOLD_BRIGHT}; }
        }
      `}</style>
    </section>
  );
}
