import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DeliveryAreaNotice() {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
      <p className="font-medium">{t("shop.deliveryAreaNotice")}</p>
    </div>
  );
}
