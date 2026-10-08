import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function TipSelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(false);
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">{t("tips.title")}</legend>
    <div className="flex flex-wrap gap-2">
      {[0, 2, 3, 5].map((amount) => <Button key={amount} type="button" size="sm" variant={!custom && value === amount ? "default" : "outline"} aria-pressed={!custom && value === amount} onClick={() => { setCustom(false); onChange(amount); }}>{amount === 0 ? t("tips.none") : `$${amount}`}</Button>)}
      <Button type="button" size="sm" variant={custom ? "default" : "outline"} aria-pressed={custom} onClick={() => { setCustom(true); onChange(0); }}>{t("tips.other")}</Button>
    </div>
    {custom && <label className="flex items-center gap-2 text-sm"><span>{t("tips.amount")}</span><input aria-label={t("tips.amount")} type="number" min="0" max="200" step="0.01" value={value || ""} onChange={(e) => onChange(Math.min(200, Math.max(0, Number(e.target.value) || 0)))} className="w-28 rounded-md border border-input bg-background px-3 py-2" /></label>}
    <p className="text-xs text-muted-foreground">{t("tips.share")}</p>
  </fieldset>;
}