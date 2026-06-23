import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n, { getLocale } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: i18n.t("terms.metaTitle") },
      { name: "description", content: i18n.t("terms.metaDesc") },
    ],
  }),
  component: TermsPage,
});

const BLUE = "#1e3a5f";

function TermsPage() {
  const { t } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.7,
        color: BLUE,
      }}
    >
      <Link to="/ruleta" style={{ color: BLUE }}>
        {t("terms.backToRoulette")}
      </Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>{t("terms.title")}</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        {t("terms.lastUpdated")} {lastUpdated}
      </p>

      <section style={{ marginTop: 24 }}>
        <h3>{t("terms.s1Title")}</h3>
        <p>
          {t("terms.s1BodyPre")}
          <Link to="/sweepstakes-rules" style={{ color: BLUE }}>
            {t("terms.s1Link")}
          </Link>
          {t("terms.s1BodyPost")}
        </p>
        <h3>{t("terms.s2Title")}</h3>
        <p>{t("terms.s2Body")}</p>
        <h3>{t("terms.s3Title")}</h3>
        <p>{t("terms.s3Body")}</p>
        <h3>{t("terms.s4Title")}</h3>
        <p>
          {t("terms.s4BodyPre")}
          <Link to="/sweepstakes-rules" style={{ color: BLUE }}>
            {t("terms.s4Link")}
          </Link>
          {t("terms.s4BodyPost")}
        </p>
        <h3>{t("terms.s5Title")}</h3>
        <p>{t("terms.s5Body")}</p>
        <h3>{t("terms.s6Title")}</h3>
        <p>{t("terms.s6Body")}</p>
        <h3>{t("terms.s7Title")}</h3>
        <p>{t("terms.s7Body")}</p>
      </section>
    </main>
  );
}
