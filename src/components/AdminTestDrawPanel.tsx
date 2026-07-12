import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { triggerTestDraw } from "@/lib/admin-draw.functions";

const BEIGE = "#f3ead8";
const WOOD = "#3b2417";
const GOLD = "#c9a36b";
const GOLD_BRIGHT = "#e6c181";

// Admin-only panel. Lazy-loaded from LiveDrawSection so the bundle is
// never shipped to unauthenticated / non-admin visitors of /ruleta.
export default function AdminTestDrawPanel({ onResult }: { onResult: () => void }) {
  const { t } = useTranslation();
  const triggerFn = useServerFn(triggerTestDraw);

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
      toast.success(t("liveDraw.drawRan", { status: res.status }));
      onResult();
    },
    onError: () => toast.error(t("liveDraw.drawTestError")),
  });

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
            {t("liveDraw.adminPanel")}
          </div>
          <div style={{ fontSize: 13, color: `${BEIGE}cc`, marginTop: 4 }}>
            {t("liveDraw.adminDesc")}
          </div>
        </div>
        <button
          disabled={mut.isPending}
          onClick={() => {
            if (!confirm(t("liveDraw.runDrawConfirm"))) return;
            mut.mutate();
          }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
            color: WOOD, fontWeight: 900, fontSize: 13, letterSpacing: "0.15em",
            cursor: mut.isPending ? "wait" : "pointer", whiteSpace: "nowrap",
          }}
        >
          {mut.isPending ? t("liveDraw.running") : t("liveDraw.runDraw")}
        </button>
      </div>

      {lastResult && (
        <div style={{
          padding: 14, borderRadius: 12, background: "rgba(0,0,0,0.35)",
          display: "grid", gap: 8, fontSize: 13,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: `${BEIGE}99` }}>{t("liveDraw.status")}</span>
            <strong style={{ color: GOLD_BRIGHT, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              {lastResult.status}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>{t("liveDraw.date")}</span>
            <span>{lastResult.drawDate}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>{t("liveDraw.winner")}</span>
            <strong style={{ color: BEIGE }}>{lastResult.winnerDisplayName ?? t("liveDraw.noParticipantsShort")}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: `${BEIGE}99` }}>{t("liveDraw.prize")}</span>
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
              {t("liveDraw.alreadyDrawn")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
