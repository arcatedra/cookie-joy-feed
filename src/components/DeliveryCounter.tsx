import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionGate } from "@/lib/subscription-gate";

export function DeliveryCounter() {
  const { t } = useTranslation();
  const { deliveryStatus: status } = useSubscriptionGate();

  if (!status?.hasActiveSubscription) return null;

  const remaining = status.remaining;
  const total = status.deliveriesPerMonth;
  const ratio = remaining / Math.max(1, total);

  const colorClass =
    remaining === 0
      ? "bg-red-100 text-red-700 ring-red-200"
      : ratio <= 0.3
        ? "bg-amber-100 text-amber-800 ring-amber-200"
        : "bg-emerald-100 text-emerald-800 ring-emerald-200";

  return (
    <Link
      to="/deliveries"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition hover:opacity-90 ${colorClass}`}
      title={t("deliveryCounter.title", { remaining, total })}
    >
      <Truck className="h-3.5 w-3.5" />
      <span>{remaining}</span>
      <span className="hidden sm:inline font-medium opacity-80">{t("deliveryCounter.remainingShort")}</span>
    </Link>
  );
}
