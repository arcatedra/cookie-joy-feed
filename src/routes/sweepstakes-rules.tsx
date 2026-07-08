import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getSweepstakesPublicConfig } from "@/lib/sweepstakes-config.functions";
import i18n, { getLocale } from "@/i18n";

export const Route = createFileRoute("/sweepstakes-rules")({
  head: () => ({
    meta: [
      { title: i18n.t("sweepstakesRules.metaTitle") },
      { name: "description", content: i18n.t("sweepstakesRules.metaDesc") },
    ],
  }),
  component: RulesPage,
});

const BLUE = "#1e3a5f";
const BEIGE = "#f4f1ea";

function RulesPage() {
  const { t } = useTranslation();
  const fetchCfg = useServerFn(getSweepstakesPublicConfig);
  const { data: cfg } = useQuery({
    queryKey: ["sweepstakes-public-config"],
    queryFn: () => fetchCfg(),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  const sponsorName = cfg?.sponsor_name ?? "HAZOREX LLC";
  const sponsorAddress = cfg?.address_valid
    ? cfg!.sponsor_address
    : t("sweepstakesRules.addressPlaceholder");
  const sponsorEmail = cfg?.sponsor_email ?? "soporte@hazorex.com";
  const excluded = (cfg?.excluded_states ?? ["FL", "RI"]).join(", ");
  const maxPrize = (cfg?.max_daily_prize_usd ?? 4999).toLocaleString("en-US");
  const claimDays = cfg?.claim_window_days ?? 14;
  const minAge = cfg?.min_age ?? 18;
  const ready = cfg?.address_valid ?? false;

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
        {t("sweepstakesRules.backToRoulette")}
      </Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>
        {t("sweepstakesRules.title")}
      </h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        {t("sweepstakesRules.lastUpdated")} {lastUpdated}
      </p>

      {!ready && (
        <div
          style={{
            background: "#fff4d6",
            border: "1px solid #c9a36b",
            padding: 16,
            borderRadius: 12,
            marginTop: 12,
          }}
        >
          <strong>{t("sweepstakesRules.preLaunchTitle")}</strong>
          {t("sweepstakesRules.preLaunchBodyPre")}
          <strong>{t("sweepstakesRules.preLaunchBodyBold")}</strong>
          {t("sweepstakesRules.preLaunchBodyPost")}
        </div>
      )}

      <p style={{ background: BEIGE, padding: 16, borderRadius: 12, fontWeight: 700, marginTop: 20 }}>
        {t("sweepstakesRules.noPurchaseBanner")}
      </p>

      

      <section style={{ marginTop: 32 }}>
        <h3>{t("sweepstakesRules.s1Title")}</h3>
        <p>
          {t("sweepstakesRules.s1Body", {
            sponsor: sponsorName,
            address: sponsorAddress,
            email: sponsorEmail,
          })}
        </p>

        <h3>{t("sweepstakesRules.s2Title")}</h3>
        <p>
          {t("sweepstakesRules.s2BodyPre")}
          {minAge}
          {t("sweepstakesRules.s2BodyMid1")}
          <strong>{t("sweepstakesRules.s2VoidIn", { excluded })}</strong>
          {t("sweepstakesRules.s2BodyMid2")}
        </p>

        <h3>{t("sweepstakesRules.s3Title")}</h3>
        <p>{t("sweepstakesRules.s3Body")}</p>

        <h3>{t("sweepstakesRules.s4Title")}</h3>
        <p>
          {t("sweepstakesRules.s4IntroPre")}
          <strong>{t("sweepstakesRules.s4IntroBold")}</strong>
          {t("sweepstakesRules.s4IntroPost")}
        </p>
        <p>
          <strong>{t("sweepstakesRules.s4_1Bold")}</strong>
          {t("sweepstakesRules.s4_1Body")}
        </p>
        <p>
          <strong>{t("sweepstakesRules.s4_2Bold")}</strong>
          {t("sweepstakesRules.s4_2BodyPre")}
          <Link to="/ruleta" style={{ color: BLUE, fontWeight: 700 }}>
            {t("sweepstakesRules.s4_2Link")}
          </Link>
          {t("sweepstakesRules.s4_2BodyPost")}
        </p>
        <p>
          <strong>{t("sweepstakesRules.s4MailBold")}</strong>
          {t("sweepstakesRules.s4MailBody", { sponsor: sponsorName, address: sponsorAddress })}
        </p>

        <h3>{t("sweepstakesRules.s5Title")}</h3>
        <p>
          {t("sweepstakesRules.s5BodyPre")}
          <strong>{t("sweepstakesRules.s5BodyBold", { maxPrize })}</strong>
          {t("sweepstakesRules.s5BodyPost")}
        </p>

        <h3>{t("sweepstakesRules.s6Title")}</h3>
        <p>{t("sweepstakesRules.s6Body")}</p>

        <h3>{t("sweepstakesRules.s7Title")}</h3>
        <p>{t("sweepstakesRules.s7Body")}</p>

        <h3>{t("sweepstakesRules.s8Title")}</h3>
        <p>
          {t("sweepstakesRules.s8BodyPre")}
          <strong>{t("sweepstakesRules.s8DaysBold", { claimDays })}</strong>
          {t("sweepstakesRules.s8BodyPost")}
          <span style={{ fontFamily: "monospace" }}>{t("sweepstakesRules.s8Code")}</span>
          {t("sweepstakesRules.s8BodyEnd")}
        </p>

        <h3>{t("sweepstakesRules.s9Title")}</h3>
        <p>{t("sweepstakesRules.s9Body")}</p>

        <h3>{t("sweepstakesRules.s10Title")}</h3>
        <p>{t("sweepstakesRules.s10Body")}</p>

        <h3>{t("sweepstakesRules.s11Title")}</h3>
        <p>
          {t("sweepstakesRules.s11BodyPre")}
          <Link to="/terms" style={{ color: BLUE }}>
            {t("sweepstakesRules.s11Link")}
          </Link>
          {t("sweepstakesRules.s11BodyPost")}
        </p>

        <h3>{t("sweepstakesRules.s12Title")}</h3>
        <p>
          {t("sweepstakesRules.s12BodyPre")}
          <strong>{t("sweepstakesRules.s12BodyBold")}</strong>
        </p>

        <h3>{t("sweepstakesRules.s13Title")}</h3>
        <p>
          {t("sweepstakesRules.s13BodyPre")}
          <Link to="/ruleta" style={{ color: BLUE }}>
            {t("sweepstakesRules.s13Link")}
          </Link>
          {t("sweepstakesRules.s13BodyPost")}
        </p>

        <h3>{t("sweepstakesRules.s14Title")}</h3>
        <p>{t("sweepstakesRules.s14Body")}</p>
      </section>

      <p style={{ marginTop: 40, fontSize: 12, color: "#888" }}>
        {t("sweepstakesRules.footer", {
          year: new Date().getFullYear(),
          sponsor: sponsorName,
        })}
      </p>
    </main>
  );
}

