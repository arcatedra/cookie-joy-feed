import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  DONATION_PRESETS,
  TIER_LABEL,
  tierForAmount,
  type DonationTier,
} from "@/lib/donation-tier";
import { createDonationCheckout } from "@/lib/donations.functions";
import { TierBadge } from "@/components/TierBadge";
import { useAuth } from "@/lib/auth";
import i18n from "@/i18n";

const searchSchema = z.object({
  status: z.enum(["success", "cancel"]).optional(),
  donation_id: z.string().optional(),
});

export const Route = createFileRoute("/donate")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: i18n.t("donate.metaTitle") },
      { name: "description", content: i18n.t("donate.metaDesc") },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  const { t } = useTranslation();
  const { status, donation_id } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const startCheckout = useServerFn(createDonationCheckout);

  const [amount, setAmount] = useState<number>(20);
  const [customInput, setCustomInput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "success") {
      toast.success(t("donate.thanks"));
      navigate({ to: "/donate", search: {}, replace: true });
    } else if (status === "cancel") {
      toast.info(t("donate.cancelled"));
      navigate({ to: "/donate", search: {}, replace: true });
    }
  }, [status, donation_id, navigate, t]);

  const effectiveAmount = useMemo(() => {
    const custom = parseFloat(customInput);
    if (!Number.isNaN(custom) && custom > 0) return custom;
    return amount;
  }, [amount, customInput]);

  const previewTier: DonationTier | null = tierForAmount(effectiveAmount);

  const onDonate = async () => {
    if (!user) {
      toast.error(t("donate.signInRequired"));
      navigate({ to: "/auth" });
      return;
    }
    if (!previewTier) {
      toast.error(t("donate.minAmount"));
      return;
    }
    setLoading(true);
    try {
      const result = await startCheckout({ data: { amount: effectiveAmount } });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error(t("donate.noPaymentUrl"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("donate.checkoutError"));
      setLoading(false);
    }
  };

  const allTiers: DonationTier[] = [
    "azul",
    "bronce",
    "oro",
    "premium",
    "corona",
    "estrella_suprema",
  ];

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] px-5 py-12 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/10 backdrop-blur">
            <Heart className="h-7 w-7 text-amber-300" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t("donate.heroTitle")}
          </h1>
          <p className="mt-3 text-sm text-white/80 md:text-base">
            {t("donate.heroDesc")}
          </p>
        </div>
      </header>

      <section className="mx-auto -mt-8 max-w-2xl px-5">
        <div className="rounded-3xl bg-card p-6 shadow-xl ring-1 ring-border md:p-8">
          <h2 className="text-base font-bold uppercase tracking-[0.12em] text-foreground">
            {t("donate.chooseAmount")}
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
            {DONATION_PRESETS.map((p) => {
              const selected = !customInput && amount === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmount(p);
                    setCustomInput("");
                  }}
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  ${p}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label
              htmlFor="custom-amount"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("donate.customAmount")}
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary">
              <span className="pl-4 text-lg font-bold text-muted-foreground">$</span>
              <input
                id="custom-amount"
                type="number"
                min={1}
                step="0.01"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="100.00"
                className="w-full bg-transparent px-2 py-3 text-lg font-semibold text-foreground focus:outline-none"
              />
              <span className="pr-4 text-xs font-medium text-muted-foreground">USD</span>
            </div>
          </div>

          {previewTier && (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("donate.yourBadge")}
                </p>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  {TIER_LABEL[previewTier]}
                </p>
              </div>
              <TierBadge tier={previewTier} size="lg" />
            </div>
          )}

          <button
            type="button"
            onClick={onDonate}
            disabled={loading || !previewTier}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("donate.redirecting")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />{" "}
                {t("donate.donateBtn", { amount: effectiveAmount.toFixed(2) })}
              </>
            )}
          </button>

          {!user && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("donate.noAccountBefore")}
              <Link to="/auth" className="font-semibold text-primary underline">
                {t("donate.signInWord")}
              </Link>
              {t("donate.noAccountAfter")}
            </p>
          )}

          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            {t("donate.secureNotice")}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-3xl px-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {t("donate.tiersTitle")}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {allTiers.map((tier) => (
            <div
              key={tier}
              className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-border"
            >
              <TierBadge tier={tier} size="lg" />
              <p className="text-[11px] font-medium text-muted-foreground">
                {t(`donate.tierRange.${tier}`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
