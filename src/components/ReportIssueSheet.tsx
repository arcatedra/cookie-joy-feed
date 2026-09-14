import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, PackageX, PackageOpen, Truck, HelpCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createOrderIssue, type IssueReason } from "@/lib/support.functions";

const REASONS: { key: IssueReason; i18nKey: string; fallback: string; Icon: typeof PackageX }[] = [
  { key: "falta_articulo", i18nKey: "issue.missingItem", fallback: "Falta un artículo", Icon: PackageX },
  { key: "danado", i18nKey: "issue.damaged", fallback: "Llegó dañado", Icon: PackageOpen },
  { key: "no_llego", i18nKey: "issue.notDelivered", fallback: "No me llegó", Icon: Truck },
  { key: "otro", i18nKey: "issue.other", fallback: "Otro", Icon: HelpCircle },
];

export function ReportIssueSheet({
  orderId,
  open,
  onOpenChange,
  onCreated,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (issueId: string) => void;
}) {
  const { t } = useTranslation();
  const create = useServerFn(createOrderIssue);
  const [pending, setPending] = useState<IssueReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (reason: IssueReason) => {
    setPending(reason);
    setError(null);
    try {
      const res = await create({ data: { orderId, reason } });
      onOpenChange(false);
      onCreated(res.issueId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el reporte");
    } finally {
      setPending(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-[#c8862e]/30 bg-white">
        <SheetHeader>
          <SheetTitle className="text-[#1e3a5f]">
            {t("issue.title", { defaultValue: "¿Qué pasó con tu pedido?" })}
          </SheetTitle>
        </SheetHeader>
        <p className="pt-1 text-sm text-[#4a3525]">
          {t("issue.subtitle", {
            defaultValue: "Elige un motivo y te conectamos con Soporte Hazorex.",
          })}
        </p>
        <div className="space-y-3 py-4">
          {REASONS.map(({ key, i18nKey, fallback, Icon }) => (
            <button
              key={key}
              type="button"
              disabled={pending !== null}
              onClick={() => pick(key)}
              className="flex h-14 w-full items-center gap-3 rounded-xl border-2 border-[#c8862e]/40 bg-[#f4f1ea] px-4 text-left text-base font-bold text-[#1e3a5f] hover:bg-[#c8862e]/10 disabled:opacity-60"
            >
              {pending === key ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Icon className="size-5 text-[#c8862e]" />
              )}
              {t(i18nKey, { defaultValue: fallback })}
            </button>
          ))}
        </div>
        {error && <p className="pb-3 text-sm font-semibold text-red-700">{error}</p>}
      </SheetContent>
    </Sheet>
  );
}
