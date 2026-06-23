import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getRouletteState,
  submitAmoeEntry,
  startMission,
  claimMission,
  spin,
} from "@/lib/roulette.functions";
import { createStarsCheckout } from "@/lib/stars-checkout.functions";
import { PrizePoolCounter } from "@/components/PrizePoolCounter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LiveDrawSection } from "@/components/LiveDrawSection";
import {
  MISSIONS,
  PRIZES,
  SPIN_COST,
  TOKEN_PACKAGES,
  type MissionKey,
} from "@/lib/roulette-config";


export const Route = createFileRoute("/ruleta")({
  head: () => ({
    meta: [
      { title: "Ruleta ORIGEN — Gira y gana ⭐" },
      {
        name: "description",
        content:
          "Gira la Ruleta ORIGEN. Compra Estrellas o participa gratis siguiendo nuestras redes y reclama premios premium.",
      },
      { property: "og:title", content: "Ruleta ORIGEN — Gira y gana" },
      {
        property: "og:description",
        content: "Premios, descuentos y sabores sorpresa. Participación gratuita disponible.",
      },
    ],
  }),
  component: RuletaPage,
});

// ── Design tokens (scoped here) ─────────────────────────────
const BEIGE = "#f3ead8";
const BEIGE_DEEP = "#e9dcc0";
const BLUE = "#1e3a5f";
const BLUE_SOFT = "#2a4d7d";
const WOOD = "#3b2417";
const GOLD = "#c9a36b";
const GOLD_BRIGHT = "#e6c181";

const woodTexture =
  "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.05), transparent 50%), repeating-linear-gradient(92deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(178deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 7px)";

function Star({ size = 24, color = GOLD_BRIGHT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2l2.39 6.96H22l-5.93 4.31L18.46 22 12 17.27 5.54 22l2.39-8.73L2 8.96h7.61z" />
    </svg>
  );
}

function RuletaPage() {
  const qc = useQueryClient();
  const fetchState = useServerFn(getRouletteState);
  const { data: state, isLoading } = useQuery({
    queryKey: ["roulette-state"],
    queryFn: () => fetchState(),
    refetchOnWindowFocus: false,
  });

  const balance = state?.balance ?? 0;
  const canSpin = balance >= SPIN_COST;

  const spinFn = useServerFn(spin);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastPrize, setLastPrize] = useState<{
    label: string;
    code: string | null;
  } | null>(null);

  const sectorAngle = 360 / PRIZES.length;

  const handleSpin = async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setLastPrize(null);
    try {
      const res = await spinFn();
      if (!res.ok) {
        toast.error(res.error);
        setSpinning(false);
        return;
      }
      const targetCenter = res.prizeIndex * sectorAngle + sectorAngle / 2;
      // Spin clockwise N turns, final position so pointer (top, 0deg) lands on target center.
      const turns = 6;
      const final = 360 * turns + (360 - targetCenter);
      // Continuous rotation: bump by a delta that ends at `final mod 360`.
      const currentMod = ((rotation % 360) + 360) % 360;
      const delta = 360 * turns + (((360 - targetCenter) - currentMod + 360) % 360);
      setRotation(rotation + delta);
      setTimeout(() => {
        setSpinning(false);
        setLastPrize({ label: res.prizeLabel, code: res.couponCode });
        qc.invalidateQueries({ queryKey: ["roulette-state"] });
      }, 4800);
      void final;
    } catch (e) {
      toast.error("Error al girar.");
      setSpinning(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `radial-gradient(ellipse at top, ${BEIGE} 0%, ${BEIGE_DEEP} 100%)`,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: BLUE,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem clamp(1rem, 4vw, 3rem)",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Star size={32} color={BLUE} />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: "0.18em", fontSize: 18 }}>ORIGEN</div>
            <div style={{ fontSize: 11, color: BLUE_SOFT, letterSpacing: "0.2em" }}>
              SWEEPSTAKES
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSwitcher variant="light" />
          <TokenChip balance={balance} loading={isLoading} />
        </div>
      </header>

      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "clamp(1.5rem, 4vw, 3rem)",
          padding: "0 clamp(1rem, 4vw, 3rem) 4rem",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div id="live-draw" style={{ scrollMarginTop: 80 }}>
          <LiveDrawSection
            balance={balance}
            onSpend={() => qc.invalidateQueries({ queryKey: ["roulette-state"] })}
          />
        </div>

        <TestDrawButton onDone={() => qc.invalidateQueries({ queryKey: ["roulette-state"] })} />

        {/* Legacy mini-ruleta removed — live draw is now the main mechanic */}

        <BuyTokensPanel balance={balance} />

        <AmoeFlow
          state={state}
          onChange={() => qc.invalidateQueries({ queryKey: ["roulette-state"] })}
        />

        <Legal />
      </main>
    </div>
  );
}

function TokenChip({ balance, loading }: { balance: number; loading: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: BLUE,
        color: BEIGE,
        padding: "10px 18px",
        borderRadius: 999,
        fontWeight: 700,
        boxShadow: `0 8px 24px -8px ${BLUE}`,
      }}
    >
      <Star size={18} color={GOLD_BRIGHT} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{loading ? "…" : balance}</span>
      <span style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.15em" }}>ESTRELLAS</span>
    </div>
  );
}

function Wheel({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  const sectorAngle = 360 / PRIZES.length;
  const radius = 180;
  const center = 200;
  const sectors = useMemo(() => {
    return PRIZES.map((p, i) => {
      const startAngle = i * sectorAngle - 90;
      const endAngle = startAngle + sectorAngle;
      const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
      const labelAngle = startAngle + sectorAngle / 2;
      const lx = center + radius * 0.62 * Math.cos((labelAngle * Math.PI) / 180);
      const ly = center + radius * 0.62 * Math.sin((labelAngle * Math.PI) / 180);
      return { path, color: p.color, label: p.label, lx, ly, labelAngle, key: p.key };
    });
  }, [sectorAngle]);

  return (
    <div
      style={{
        position: "relative",
        width: "min(92vw, 440px)",
        aspectRatio: "1",
        padding: 20,
        borderRadius: "50%",
        background: WOOD,
        backgroundImage: woodTexture,
        boxShadow: `0 30px 60px -20px rgba(30,58,95,0.4), inset 0 0 0 6px ${GOLD}, inset 0 0 0 12px ${WOOD}`,
      }}
    >
      {/* Pointer (top, elegant gem) */}
      <div
        style={{
          position: "absolute",
          top: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 26,
          height: 36,
          background: `linear-gradient(180deg, ${GOLD_BRIGHT}, ${GOLD})`,
          clipPath: "polygon(50% 100%, 0 0, 100% 0)",
          boxShadow: `0 4px 10px rgba(0,0,0,0.3)`,
          zIndex: 3,
        }}
      />
      <svg
        viewBox="0 0 400 400"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          borderRadius: "50%",
          background: BEIGE,
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? "transform 4.6s cubic-bezier(0.17, 0.67, 0.16, 1)"
            : "transform 0s",
        }}
      >
        {sectors.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke={BEIGE} strokeWidth={2} />
            <text
              x={s.lx}
              y={s.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${s.labelAngle + 90}, ${s.lx}, ${s.ly})`}
              style={{
                fontSize: 13,
                fontWeight: 700,
                fill: BEIGE,
                letterSpacing: "0.02em",
              }}
            >
              {s.label.length > 14 ? s.label.slice(0, 13) + "…" : s.label}
            </text>
          </g>
        ))}
        {/* Center cap */}
        <circle cx={200} cy={200} r={28} fill={BLUE} />
        <circle cx={200} cy={200} r={22} fill="none" stroke={GOLD_BRIGHT} strokeWidth={2} />
      </svg>
      {/* Centered star overlay (doesn't rotate) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
      >
        <Star size={28} color={GOLD_BRIGHT} />
      </div>
    </div>
  );
}

function SpinButton({
  onClick,
  disabled,
  balance,
}: {
  onClick: () => void;
  disabled: boolean;
  balance: number;
}) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: "16px 48px",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "0.1em",
          background: disabled
            ? `linear-gradient(180deg, ${BEIGE_DEEP}, ${BEIGE})`
            : `linear-gradient(180deg, ${BLUE_SOFT}, ${BLUE})`,
          color: disabled ? BLUE_SOFT : BEIGE,
          border: `2px solid ${GOLD}`,
          borderRadius: 999,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: disabled ? "none" : `0 14px 30px -10px ${BLUE}`,
          transition: "transform 0.15s",
        }}
        onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        GIRAR ({SPIN_COST} ⭐)
      </button>
      {balance < SPIN_COST && (
        <p style={{ fontSize: 13, color: BLUE_SOFT }}>
          Necesitas {SPIN_COST - balance} estrella(s) más para girar.
        </p>
      )}
    </div>
  );
}

function PrizeCard({ prize }: { prize: { label: string; code: string | null } }) {
  return (
    <div
      style={{
        background: BLUE,
        color: BEIGE,
        padding: "24px 32px",
        borderRadius: 20,
        border: `2px solid ${GOLD}`,
        textAlign: "center",
        animation: "scale-in 0.3s ease-out",
        maxWidth: 420,
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: "0.3em", opacity: 0.7 }}>TU PREMIO</div>
      <div style={{ fontSize: 24, fontWeight: 800, margin: "8px 0" }}>{prize.label}</div>
      {prize.code && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: "0.2em" }}>CÓDIGO</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(prize.code!);
              toast.success("Código copiado");
            }}
            style={{
              marginTop: 6,
              background: GOLD,
              color: WOOD,
              padding: "10px 20px",
              borderRadius: 10,
              fontWeight: 800,
              letterSpacing: "0.15em",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {prize.code} ⧉
          </button>
        </div>
      )}
    </div>
  );
}

function BuyTokensPanel({ balance }: { balance: number }) {
  const checkout = useServerFn(createStarsCheckout);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleBuy = async (packageId: typeof TOKEN_PACKAGES[number]["id"]) => {
    if (!acceptedTerms) {
      toast.error("Debes aceptar los Términos y confirmar que es legal en tu lugar de residencia.");
      return;
    }
    if (!user) {
      toast.info("Inicia sesión para comprar estrellas.");
      navigate({ to: "/auth", search: { redirect: "/ruleta" } });
      return;
    }
    setLoadingId(packageId);
    try {
      const res = await checkout({ data: { packageId } });
      if (res.url) window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al iniciar el checkout.");
      setLoadingId(null);
    }
  };

  const scrollToDraw = () => {
    document.getElementById("live-draw")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section style={{ display: "grid", gap: 28 }}>
      {/* Balance hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_SOFT} 100%)`,
          borderRadius: 20,
          padding: "22px 26px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          color: BEIGE,
          border: `1px solid ${GOLD}55`,
          boxShadow: `0 18px 40px -20px ${BLUE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${GOLD_BRIGHT}, ${GOLD})`,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 6px 18px -4px ${GOLD}`,
            }}
          >
            <Star size={28} color={WOOD} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", opacity: 0.7 }}>
              TU SALDO ACTUAL
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {balance} <span style={{ fontSize: 14, opacity: 0.7 }}>⭐ estrellas</span>
            </div>
          </div>
        </div>
        <button
          onClick={scrollToDraw}
          style={{
            background: GOLD,
            color: WOOD,
            border: "none",
            padding: "12px 22px",
            borderRadius: 999,
            fontWeight: 900,
            letterSpacing: "0.12em",
            fontSize: 13,
            cursor: "pointer",
            boxShadow: `0 8px 20px -8px ${GOLD}`,
          }}
        >
          CANJEAR POR TICKETS →
        </button>
      </div>

      <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 900,
            color: BLUE,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Compra Estrellas
        </h2>
        <p style={{ color: BLUE_SOFT, fontSize: 15, margin: 0 }}>
          Acumula estrellas y canjéalas por tickets en la Ruleta Diaria.
        </p>
      </div>

      <PrizePoolCounter />


      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "16px 18px",
          background: BEIGE,
          border: `2px solid ${acceptedTerms ? GOLD : BLUE_SOFT}55`,
          borderRadius: 14,
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
      >
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          style={{ marginTop: 3, width: 18, height: 18, accentColor: GOLD, cursor: "pointer", flexShrink: 0 }}
          aria-required
        />
        <span style={{ fontSize: 13, color: BLUE, lineHeight: 1.5 }}>
          Acepto los{" "}
          <Link to="/terms" style={{ color: WOOD, fontWeight: 700, textDecoration: "underline" }}>
            Términos y Condiciones
          </Link>{" "}
          y confirmo que la participación en este sorteo es legal en mi lugar de residencia.
        </span>
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          alignItems: "stretch",
          opacity: acceptedTerms ? 1 : 0.55,
          pointerEvents: acceptedTerms ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
      >
        {TOKEN_PACKAGES.map((pkg) => {
          const featured = pkg.featured ?? false;
          const isLoading = loadingId === pkg.id;
          return (
            <article
              key={pkg.id}
              style={{
                position: "relative",
                background: featured
                  ? `linear-gradient(160deg, #fff8ea 0%, ${BEIGE} 100%)`
                  : BEIGE,
                border: `2px solid ${featured ? GOLD : BEIGE_DEEP}`,
                borderRadius: 24,
                padding: "28px 22px 22px",
                boxShadow: featured
                  ? `0 24px 50px -16px ${GOLD}66, 0 0 0 6px ${GOLD}1a`
                  : `0 12px 28px -16px rgba(30,58,95,0.25)`,
                transform: featured ? "translateY(-8px)" : "none",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                gap: 16,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = featured
                  ? "translateY(-12px)"
                  : "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = featured ? "translateY(-8px)" : "none";
              }}
            >
              {featured && (
                <div
                  style={{
                    position: "absolute",
                    top: -14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: `linear-gradient(90deg, ${GOLD}, ${GOLD_BRIGHT}, ${GOLD})`,
                    color: WOOD,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                    padding: "6px 14px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    boxShadow: `0 6px 14px -4px ${GOLD}`,
                  }}
                >
                  ★ MÁS POPULAR ★
                </div>
              )}

              <header>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.3em",
                    color: featured ? WOOD : BLUE_SOFT,
                    fontWeight: 800,
                  }}
                >
                  {pkg.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: BLUE_SOFT, marginTop: 2 }}>{pkg.tagline}</div>
              </header>

              <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Star size={36} color={featured ? GOLD : GOLD_BRIGHT} />
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      color: BLUE,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {pkg.tokens}
                  </span>
                </div>
                <div style={{ fontSize: 11, letterSpacing: "0.15em", color: BLUE_SOFT }}>
                  ESTRELLAS
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 28,
                    fontWeight: 800,
                    color: WOOD,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ${pkg.priceUsd}
                  <span style={{ fontSize: 14, color: BLUE_SOFT, marginLeft: 4 }}>USD</span>
                </div>
              </div>

              <button
                onClick={() => handleBuy(pkg.id)}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: featured
                    ? `linear-gradient(180deg, ${GOLD_BRIGHT}, ${GOLD})`
                    : `linear-gradient(180deg, ${BLUE_SOFT}, ${BLUE})`,
                  color: featured ? WOOD : BEIGE,
                  border: "none",
                  borderRadius: 14,
                  fontWeight: 900,
                  cursor: isLoading ? "wait" : "pointer",
                  letterSpacing: "0.15em",
                  fontSize: 14,
                  boxShadow: featured
                    ? `0 10px 24px -10px ${GOLD}`
                    : `0 10px 24px -10px ${BLUE}`,
                  transition: "transform 0.1s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {isLoading ? "REDIRIGIENDO…" : "COMPRAR AHORA"}
              </button>
            </article>
          );
        })}
      </div>

      {/* Fair-Play certified badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: `linear-gradient(135deg, ${BEIGE} 0%, #fff8ea 100%)`,
          border: `1px solid ${GOLD}`,
          borderRadius: 14,
          padding: "14px 18px",
          color: BLUE,
          fontSize: 13,
          textAlign: "center",
          boxShadow: `inset 0 0 0 1px ${GOLD}22`,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: BLUE,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={GOLD_BRIGHT} aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 900, letterSpacing: "0.1em", fontSize: 12, color: BLUE }}>
            CERTIFIED FAIR PLAY · NO RIGGED
          </div>
          <div style={{ fontSize: 11, color: BLUE_SOFT, marginTop: 2 }}>
            Selección aleatoria criptográfica · ponderación pública · auditable
          </div>
        </div>
      </div>

      {/* Legal footer */}
      <footer
        style={{
          background: BLUE,
          color: BEIGE,
          borderRadius: 18,
          padding: "20px 22px",
          display: "grid",
          gap: 12,
          textAlign: "center",
          fontSize: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "18px",
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          <a href="/terms" style={{ color: GOLD_BRIGHT, textDecoration: "none" }}>
            Términos y Condiciones
          </a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/sweepstakes-rules" style={{ color: GOLD_BRIGHT, textDecoration: "none" }}>
            Reglas Oficiales del Sorteo
          </a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="#amoe" style={{ color: GOLD_BRIGHT, textDecoration: "none" }}>
            Método de Participación Gratuita
          </a>
        </div>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 11, letterSpacing: "0.04em" }}>
          NO ES NECESARIA UNA COMPRA PARA PARTICIPAR O GANAR. La compra no incrementa las
          probabilidades de ganar. Mayores de 18 años. Nulo donde la ley lo prohíba.
        </p>
      </footer>

    </section>
  );
}


type RouletteState = Awaited<ReturnType<typeof getRouletteState>>;

function AmoeFlow({
  state,
  onChange,
}: {
  state: RouletteState | undefined;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasAmoe = state?.hasAmoe ?? false;

  return (
    <section id="amoe" style={{ scrollMarginTop: 80 }}>
      <div
        style={{
          background: BEIGE,
          border: `1px dashed ${BLUE_SOFT}`,
          borderRadius: 14,
          padding: 16,
          textAlign: "center",
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: BLUE,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 15,
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          ¿No quieres comprar Estrellas? Participa gratis aquí →
        </button>
      </div>

      {open && (
        <AmoeDialog
          step={hasAmoe ? 2 : 1}
          state={state}
          onClose={() => setOpen(false)}
          onChange={onChange}
        />
      )}
    </section>
  );
}

function AmoeDialog({
  step: initialStep,
  state,
  onClose,
  onChange,
}: {
  step: 1 | 2;
  state: RouletteState | undefined;
  onClose: () => void;
  onChange: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(initialStep);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 25, 45, 0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 16,
        animation: "fade-in 0.2s",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BEIGE,
          borderRadius: 20,
          padding: "clamp(20px, 4vw, 32px)",
          maxWidth: 560,
          width: "100%",
          maxHeight: "90dvh",
          overflowY: "auto",
          border: `2px solid ${GOLD}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: BLUE, fontWeight: 800, fontSize: 20, margin: 0 }}>
            {step === 1 ? "Participación gratuita" : "Misiones de redes"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: BLUE,
            }}
          >
            ×
          </button>
        </div>

        {step === 1 ? (
          <AmoeForm
            onSuccess={() => {
              onChange();
              setStep(2);
            }}
          />
        ) : (
          <MissionList state={state} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function AmoeForm({ onSuccess }: { onSuccess: () => void }) {
  const submit = useServerFn(submitAmoeEntry);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    essay: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    dob: "",
    acceptRules: false as boolean,
  });
  const wc = form.essay.trim().split(/\s+/).filter(Boolean).length;
  const m = useMutation({
    mutationFn: () =>
      submit({
        data: {
          ...form,
          state: form.state.toUpperCase(),
          acceptRules: true as const,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("¡Recibimos tu entrada gratuita! 🎟️ Tienes 1 boleto en el sorteo de hoy.");
        onSuccess();
      } else {
        toast.error(res.error);
      }
    },
  });

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${BEIGE_DEEP}`,
    background: "white",
    color: BLUE,
    fontSize: 15,
  } as const;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.acceptRules) return toast.error("Debes aceptar las Reglas Oficiales.");
        if (wc < 300) return toast.error("El ensayo debe tener al menos 300 palabras.");
        m.mutate();
      }}
      style={{ display: "grid", gap: 12, marginTop: 16 }}
    >
      <p style={{ fontSize: 13, color: BLUE_SOFT, margin: 0 }}>
        Entrada gratuita oficial (AMOE). <strong>1 boleto real</strong> en el sorteo de hoy con el
        mismo peso que un boleto pagado. NO ES NECESARIA UNA COMPRA PARA PARTICIPAR.
      </p>
      <input required placeholder="Nombre legal completo" value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inputStyle} />
      <input required type="email" placeholder="Correo electrónico" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
      <input required type="tel" placeholder="Teléfono" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, color: BLUE_SOFT }}>Fecha de nacimiento (mín. 18 años)</label>
        <input required type="date" value={form.dob}
          onChange={(e) => setForm({ ...form, dob: e.target.value })} style={inputStyle} />
      </div>
      <input required placeholder="Dirección (línea 1)" value={form.address1}
        onChange={(e) => setForm({ ...form, address1: e.target.value })} style={inputStyle} />
      <input placeholder="Dirección (línea 2, opcional)" value={form.address2}
        onChange={(e) => setForm({ ...form, address2: e.target.value })} style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
        <input required placeholder="Ciudad" value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
        <input required placeholder="Estado (CA)" maxLength={2} value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} style={inputStyle} />
        <input required placeholder="ZIP" value={form.zip}
          onChange={(e) => setForm({ ...form, zip: e.target.value })} style={inputStyle} />
      </div>
      <textarea required
        placeholder="Ensayo original: cuéntanos por qué te gusta ORIGEN (mín. 300 palabras)"
        value={form.essay} onChange={(e) => setForm({ ...form, essay: e.target.value })}
        rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ fontSize: 12, color: wc >= 300 ? "#1f7a3a" : BLUE_SOFT, textAlign: "right" }}>
        {wc} / 300 palabras
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: BLUE_SOFT }}>
        <input type="checkbox" checked={form.acceptRules}
          onChange={(e) => setForm({ ...form, acceptRules: e.target.checked })} />
        <span>
          Confirmo que tengo 18+ años, soy residente legal de EE.UU. (excepto FL, NY, RI) y acepto las{" "}
          <a href="/sweepstakes-rules" target="_blank" style={{ color: BLUE, fontWeight: 700 }}>
            Reglas Oficiales del Sorteo
          </a>.
        </span>
      </label>
      <button type="submit" disabled={m.isPending || wc < 300 || !form.acceptRules}
        style={{
          padding: "14px",
          background: wc < 300 || !form.acceptRules ? BEIGE_DEEP : BLUE,
          color: wc < 300 || !form.acceptRules ? BLUE_SOFT : BEIGE,
          border: "none", borderRadius: 10, fontWeight: 800,
          cursor: wc < 300 || !form.acceptRules ? "not-allowed" : "pointer",
          letterSpacing: "0.1em",
        }}>
        {m.isPending ? "ENVIANDO…" : "ENVIAR ENTRADA GRATUITA 🎟️"}
      </button>
      <p style={{ fontSize: 11, color: BLUE_SOFT, margin: 0, lineHeight: 1.5 }}>
        Como alternativa postal, envía una postal escrita a mano con: nombre, dirección, email,
        teléfono y fecha de nacimiento a la dirección listada en las{" "}
        <a href="/sweepstakes-rules" style={{ color: BLUE }}>Reglas Oficiales</a>.
      </p>
    </form>
  );
}

function MissionList({
  state,
  onChange,
}: {
  state: RouletteState | undefined;
  onChange: () => void;
}) {
  const claimed = new Set(state?.missionsClaimed ?? []);
  const balance = state?.balance ?? 0;
  return (
    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      <p style={{ fontSize: 14, color: BLUE_SOFT, margin: 0 }}>
        ¡Tienes tu token base! Completa estas misiones para sumar hasta <strong>9 ⭐ más</strong> y
        llegar a {SPIN_COST}.
      </p>
      {(Object.keys(MISSIONS) as MissionKey[]).map((k) => (
        <MissionCard
          key={k}
          mission={k}
          claimed={claimed.has(k)}
          startedAt={state?.missionsStarted?.[k]}
          onChange={onChange}
        />
      ))}
      <div
        style={{
          marginTop: 8,
          padding: 12,
          background: BLUE,
          color: BEIGE,
          borderRadius: 12,
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        Progreso: {balance} / {SPIN_COST} ⭐
      </div>
    </div>
  );
}

function MissionCard({
  mission,
  claimed,
  startedAt,
  onChange,
}: {
  mission: MissionKey;
  claimed: boolean;
  startedAt: number | undefined;
  onChange: () => void;
}) {
  const cfg = MISSIONS[mission];
  const start = useServerFn(startMission);
  const claim = useServerFn(claimMission);
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume countdown from server timestamp if exists.
  useEffect(() => {
    if (claimed) return;
    if (!startedAt) return;
    const elapsed = (Date.now() - startedAt) / 1000;
    const left = Math.max(0, Math.ceil(cfg.seconds - elapsed));
    setRemaining(left);
  }, [startedAt, cfg.seconds, claimed]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => (r === null ? null : Math.max(0, r - 1)));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remaining !== null]);

  const handleOpen = async () => {
    window.open(cfg.url, "_blank", "noopener,noreferrer");
    const res = await start({ data: { mission } });
    if (res.ok) {
      setRemaining(cfg.seconds);
      onChange();
    } else {
      toast.error(res.error);
    }
  };

  const handleClaim = async () => {
    const res = await claim({ data: { mission } });
    if (res.ok) {
      toast.success(`+${res.reward} ⭐`);
      onChange();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${BEIGE_DEEP}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: BLUE }}>{cfg.label}</div>
        <div style={{ fontSize: 12, color: BLUE_SOFT }}>
          +{cfg.reward} ⭐ · {cfg.seconds}s
        </div>
      </div>
      {claimed ? (
        <span style={{ color: "#1f7a3a", fontWeight: 700, fontSize: 13 }}>✓ Reclamado</span>
      ) : remaining === null ? (
        <button
          onClick={handleOpen}
          style={{
            background: BLUE,
            color: BEIGE,
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Ver video
        </button>
      ) : remaining > 0 ? (
        <span
          style={{
            color: WOOD,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            fontSize: 16,
          }}
        >
          {remaining}s
        </span>
      ) : (
        <button
          onClick={handleClaim}
          style={{
            background: GOLD,
            color: WOOD,
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 800,
            cursor: "pointer",
            fontSize: 13,
            letterSpacing: "0.05em",
          }}
        >
          Reclamar +{cfg.reward} ⭐
        </button>
      )}
    </div>
  );
}

function Legal() {
  return (
    <footer
      style={{
        marginTop: 32,
        padding: "24px",
        background: BEIGE,
        border: `1px solid ${BEIGE_DEEP}`,
        borderRadius: 14,
        fontSize: 13,
        color: BLUE_SOFT,
        lineHeight: 1.6,
        display: "grid",
        gap: 16,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong style={{ color: BLUE }}>Reglas del Sorteo (Sweepstakes):</strong> NO COMPRA NECESARIA
        para participar o ganar. La compra de Estrellas no aumenta tus probabilidades de ganar. Método
        alterno de entrada gratuita (AMOE) disponible arriba mediante formulario y misiones de redes
        sociales. Válido donde lo permita la ley. Cada premio se otorga al azar mediante algoritmo de
        selección ponderada. Los códigos canjeables tienen una sola unidad de uso.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link
          to="/sweepstakes-rules"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: BLUE,
            color: BEIGE,
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: "0.1em",
            textDecoration: "none",
            boxShadow: `0 6px 16px -6px ${BLUE}`,
            transition: "transform 0.15s",
          }}
        >
          📋 Reglas Oficiales del Sorteo
        </Link>
        <Link
          to="/terms"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "transparent",
            color: BLUE,
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: "0.1em",
            textDecoration: "none",
            border: `2px solid ${BLUE}`,
            transition: "transform 0.15s",
          }}
        >
          ⚖️ Términos y Condiciones
        </Link>
      </div>
    </footer>
  );
}
