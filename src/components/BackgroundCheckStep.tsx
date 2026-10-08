import { useTranslation } from "react-i18next";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { CHECKR_APPLY_URL, type BackgroundCheckStatus } from "@/lib/driver-config";

export function BackgroundCheckStep({ status }: { status?: BackgroundCheckStatus | null }) {
  const { t } = useTranslation();
  const s = status ?? "pendiente";
  const tone =
    s === "aprobado"
      ? "bg-emerald-100 text-emerald-800"
      : s === "rechazado"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return (
    <div className="mt-6 rounded-xl border border-[#c8862e]/40 bg-[#f4f1ea] p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-[#1e3a5f]">
          <ShieldCheck className="size-5 text-[#c8862e]" />
          {t("repartidoresPage.backgroundCheck.title")}
        </h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
          {t(`repartidoresPage.backgroundCheck.status.${s}`)}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#4a3525]">{t("repartidoresPage.backgroundCheck.body")}</p>
      {s !== "aprobado" && (
        <a
          href={CHECKR_APPLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#16294a]"
        >
          {t("repartidoresPage.backgroundCheck.cta")}
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}
