import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: i18n.t("trust.metaTitle") },
      { name: "description", content: i18n.t("trust.metaDesc") },
    ],
  }),
  component: TrustPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TrustPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:py-14">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {t("trust.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("trust.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("trust.intro")}</p>
      </header>

      <div className="space-y-8">
        <Section title={t("trust.sections.authTitle")}>
          <p>{t("trust.sections.authP1")}</p>
          <p>{t("trust.sections.authP2")}</p>
        </Section>

        <Section title={t("trust.sections.paymentsTitle")}>
          <p>{t("trust.sections.paymentsP1")}</p>
        </Section>

        <Section title={t("trust.sections.dataTitle")}>
          <p>{t("trust.sections.dataP1")}</p>
        </Section>

        <Section title={t("trust.sections.subprocessorsTitle")}>
          <p>{t("trust.sections.subprocessorsP1")}</p>
        </Section>

        <Section title={t("trust.sections.emailTitle")}>
          <p>{t("trust.sections.emailP1")}</p>
        </Section>

        <Section title={t("trust.sections.retentionTitle")}>
          <p>{t("trust.sections.retentionP1")}</p>
        </Section>

        <Section title={t("trust.sections.reportTitle")}>
          <p>{t("trust.sections.reportP1")}</p>
        </Section>

        <Section title={t("trust.sections.sharedTitle")}>
          <p>{t("trust.sections.sharedP1")}</p>
        </Section>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          {t("trust.backHome")}
        </Link>
      </footer>
    </div>
  );
}
