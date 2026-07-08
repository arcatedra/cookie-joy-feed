import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import i18n, { getLocale } from "@/i18n";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: i18n.t("privacyPage.metaTitle") },
      { name: "description", content: i18n.t("privacyPage.metaDesc") },
      { property: "og:title", content: i18n.t("privacyPage.metaTitle") },
      { property: "og:url", content: "https://hazorex.com/privacidad" },
    ],
    links: [{ rel: "canonical", href: "https://hazorex.com/privacidad" }],
  }),
  component: PrivacyPage,
});

const BLUE = "#1e3a5f";
const EMAIL = "privacy@hazorex.com";

function PrivacyPage() {
  const { t } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString(getLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

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
      <Link to="/" style={{ color: BLUE }}>{t("privacyPage.back")}</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>
        {t("privacyPage.title")}
      </h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        {t("privacyPage.lastUpdated")} {lastUpdated}
      </p>

      {sections.map((n) => {
        const bulletsRaw = t(`privacyPage.s${n}.bullets`, { returnObjects: true, defaultValue: [] }) as unknown;
        const bullets = Array.isArray(bulletsRaw) ? (bulletsRaw as string[]) : [];
        return (
          <div key={n}>
            <h2 style={{ marginTop: 32 }}>{t(`privacyPage.s${n}.title`)}</h2>
            {t(`privacyPage.s${n}.body`, { defaultValue: "" }) && (
              <p
                dangerouslySetInnerHTML={{
                  __html: t(`privacyPage.s${n}.body`, { email: EMAIL, brand: "Hazorex", domain: "hazorex.com" }),
                }}
              />
            )}
            {bullets.length > 0 && (
              <ul>
                {bullets.map((b, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </main>
  );
}
