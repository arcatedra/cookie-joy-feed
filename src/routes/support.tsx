import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail, MessageCircle, HelpCircle, ShoppingBag, Truck, RotateCcw, Trophy } from "lucide-react";
import i18n from "@/i18n";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: i18n.t("supportPage.metaTitle") },
      { name: "description", content: i18n.t("supportPage.metaDesc") },
      { property: "og:title", content: i18n.t("supportPage.metaTitle") },
      { property: "og:description", content: i18n.t("supportPage.metaOg") },
    ],
  }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "soporte@hazorex.com";

const FAQ_KEYS = [
  { Icon: ShoppingBag, id: "order" },
  { Icon: Truck, id: "delivery" },
  { Icon: RotateCcw, id: "cancel" },
  { Icon: Trophy, id: "sweepstakes" },
] as const;

function SupportPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background pb-24">
      <section className="bg-primary px-5 pt-12 pb-16 text-primary-foreground">
        <h1 className="text-3xl font-bold tracking-tight">{t("supportPage.heroTitle")}</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          {t("supportPage.heroSubtitle")}
        </p>
      </section>

      <section className="mx-auto -mt-10 max-w-3xl px-5">
        <div className="rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border">
          <h2 className="text-lg font-bold text-card-foreground">{t("supportPage.contactTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("supportPage.contactSubtitle")}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-accent"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("supportPage.emailLabel")}
                </p>
                <p className="text-sm font-bold text-card-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </a>

            <Link
              to="/suggestions"
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-accent"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("supportPage.inboxLabel")}
                </p>
                <p className="text-sm font-bold text-card-foreground">{t("supportPage.inboxCta")}</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-3xl px-5">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t("supportPage.faqTitle")}</h2>
        </div>
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          {FAQ_KEYS.map((f, i) => (
            <details
              key={f.id}
              className={`group px-5 py-4 ${i !== FAQ_KEYS.length - 1 ? "border-b border-border" : ""}`}
            >
              <summary className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-card-foreground">
                <f.Icon className="h-4 w-4 text-muted-foreground" />
                {t(`supportPage.faq.${f.id}.q`)}
              </summary>
              <p className="mt-2 pl-7 text-sm text-muted-foreground">{t(`supportPage.faq.${f.id}.a`)}</p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("supportPage.footerPre")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
