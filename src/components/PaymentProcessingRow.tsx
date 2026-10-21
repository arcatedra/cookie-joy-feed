import { useTranslation } from "react-i18next";

export function PaymentProcessingRow({ amount }: { amount: number | null | undefined }) {
  const { i18n } = useTranslation();
  if (amount == null) return null;
  return <div className="flex items-baseline justify-between gap-3 text-sm">
    <span className="min-w-0 text-muted-foreground">{i18n.language.startsWith("en") ? "Payment processing fee" : "Cargo por procesamiento de pago"}</span>
    <span className="shrink-0">${Number(amount).toFixed(2)}</span>
  </div>;
}