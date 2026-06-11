import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getMyDeliveryStatus } from "@/lib/deliveries.functions";

export function DeliveryCounter() {
  const { user } = useAuth();
  const getStatus = useServerFn(getMyDeliveryStatus);

  const { data: status } = useQuery({
    queryKey: ["delivery-status"],
    queryFn: () => getStatus(),
    enabled: !!user,
    staleTime: 30_000,
  });

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
      title={`${remaining} de ${total} entregas restantes este mes`}
    >
      <Truck className="h-3.5 w-3.5" />
      <span>{remaining}</span>
      <span className="hidden sm:inline font-medium opacity-80">rest.</span>
    </Link>
  );
}
