import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listPublicWinners } from "@/lib/winners-public.functions";
import { getSweepstakesPublicConfig } from "@/lib/sweepstakes-config.functions";
import { getLocale } from "@/i18n";


export const Route = createFileRoute("/sorteo/ganadores")({
  head: () => ({
    meta: [
      { title: "Ganadores del Sorteo Diario — HAZOREX" },
      {
        name: "description",
        content:
          "Registro público y verificable de los ganadores del Sorteo Diario de HAZOREX. Cada resultado incluye su seed hash de verificación.",
      },
      { property: "og:title", content: "Ganadores del Sorteo Diario — HAZOREX" },
      {
        property: "og:description",
        content: "Ganadores anteriores del Sorteo Diario de HAZOREX con verificación por seed hash.",
      },
    ],
  }),
  component: WinnersPage,
});

const BLUE = "#1e3a5f";
const BEIGE = "#f4f1ea";
const GOLD = "#c9a36b";

function maskName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Participante";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return `${first} ${lastInitial}.`;
}

function WinnersPage() {
  const { t } = useTranslation();
  const fetchWinners = useServerFn(listPublicWinners);
  const { data, isLoading } = useQuery({
    queryKey: ["public-winners"],
    queryFn: () => fetchWinners(),
    staleTime: 60_000,
  });

  const locale = getLocale();

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "system-ui, sans-serif",
        color: BLUE,
      }}
    >
      <Link to="/ruleta" style={{ color: BLUE }}>
        ← {t("winners.backToRoulette", { defaultValue: "Volver a la Ruleta" })}
      </Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>
        {t("winners.title", { defaultValue: "Ganadores del Sorteo Diario" })}
      </h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        {t("winners.intro", {
          defaultValue:
            "Lista pública y verificable de ganadores. Cada resultado tiene un seed hash publicado para auditoría.",
        })}
      </p>

      {isLoading ? (
        <p style={{ marginTop: 24 }}>…</p>
      ) : !data || data.length === 0 ? (
        <p style={{ marginTop: 24, background: BEIGE, padding: 20, borderRadius: 12 }}>
          {t("winners.empty", {
            defaultValue:
              "Todavía no hay ganadores publicados. Vuelve pronto — el sorteo se ejecuta a diario.",
          })}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 24, display: "grid", gap: 12 }}>
          {data.map((w) => (
            <li
              key={`${w.draw_date}-${w.seed_hash ?? ""}`}
              style={{
                background: "#fff",
                border: `1px solid ${GOLD}`,
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <strong style={{ fontSize: 16 }}>{maskName(w.winner_display_name)}</strong>
                <span style={{ fontWeight: 900, color: GOLD }}>
                  ${w.prize_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {t("winners.drawDate", { defaultValue: "Sorteo del" })}{" "}
                {new Date(w.draw_date + "T12:00:00").toLocaleDateString(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              {w.seed_hash && (
                <div style={{ fontSize: 10, color: "#999", fontFamily: "monospace", wordBreak: "break-all" }}>
                  seed: {w.seed_hash}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 40, fontSize: 12, color: "#888" }}>
        {t("winners.footer", {
          defaultValue:
            "Los nombres se muestran parcialmente por privacidad. NO ES NECESARIO COMPRAR PARA PARTICIPAR NI GANAR.",
        })}
      </p>
    </main>
  );
}
