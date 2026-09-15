import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Bloque de error con botón de reintentar.
 * Evita pantallas que se quedan cargando para siempre cuando falla una consulta.
 */
export function LoadErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
        <h2 className="mt-3 text-base font-semibold text-red-900">
          {t("common.loadErrorTitle", { defaultValue: "No pudimos cargar esta información" })}
        </h2>
        <p className="mt-1 text-sm text-red-800">
          {message ??
            t("common.loadErrorBody", {
              defaultValue: "Revisa tu conexión e inténtalo de nuevo.",
            })}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16304d]"
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", { defaultValue: "Reintentar" })}
        </button>
      </div>
    </div>
  );
}
