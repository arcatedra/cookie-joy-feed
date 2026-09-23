import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Share2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { HazorexSymbol } from "@/components/HazorexLogo";
import { Button } from "@/components/ui/button";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

const copy = {
  en: {
    eyebrow: "HAZOREX SUBSCRIPTION CLUB",
    title: "Share the Experience. Multiply the Flavor.",
    subtitle:
      "Join the HAZOREX monthly subscription club with your friend's invitation and start enjoying every delivery.",
    invitation: "Your invitation code",
    stepsTitle: "Your next favorite delivery is three steps away",
    steps: ["Use your friend's unique code.", "Join the monthly club.", "Enjoy the HAZOREX experience."],
    cta: "Join the club",
    invalidTitle: "This invitation is no longer available",
    invalidBody: "You can still create your HAZOREX account and explore the club.",
    invalidCta: "Create my account",
  },
  es: {
    eyebrow: "CLUB DE SUSCRIPCIÓN HAZOREX",
    title: "Comparte la Experiencia. Multiplica el Sabor.",
    subtitle:
      "Únete al club de suscripción mensual HAZOREX con la invitación de tu amigo y comienza a disfrutar cada entrega.",
    invitation: "Tu código de invitación",
    stepsTitle: "Tu próxima entrega favorita está a tres pasos",
    steps: ["Usa el código único de tu amigo.", "Únete al club mensual.", "Disfruta la experiencia HAZOREX."],
    cta: "Unirme al club",
    invalidTitle: "Esta invitación ya no está disponible",
    invalidBody: "Todavía puedes crear tu cuenta HAZOREX y conocer el club.",
    invalidCta: "Crear mi cuenta",
  },
} as const;

const stepIcons = [Share2, UserPlus, Gift];

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join the HAZOREX Club" },
      {
        name: "description",
        content: "Accept your HAZOREX invitation and join the monthly subscription club.",
      },
      { property: "og:title", content: "Join the HAZOREX Club" },
      {
        property: "og:description",
        content: "Accept your HAZOREX invitation and join the monthly subscription club.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralLandingPage,
});

function ReferralLandingPage() {
  const { code: rawCode } = Route.useParams();
  const code = rawCode.toUpperCase().slice(0, 16);
  const validCode = CODE_PATTERN.test(code);
  const [language, setLanguage] = useState<"en" | "es">("en");
  const text = copy[language];

  useEffect(() => {
    if (!validCode) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${REF_COOKIE}=${code}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax${secure}`;
  }, [code, validCode]);

  return (
    <main lang={language} className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden bg-primary px-5 pb-16 pt-8 text-primary-foreground sm:pb-20 sm:pt-10">
        <div className="absolute inset-x-0 bottom-0 h-2 bg-accent" aria-hidden="true" />
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <HazorexSymbol size={58} className="rounded-md bg-background p-1" />
            <div className="flex items-center rounded-md border border-primary-foreground/30 p-1" aria-label="Language selector">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className={language === "en" ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}
              >
                EN
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLanguage("es")}
                aria-pressed={language === "es"}
                className={language === "es" ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"}
              >
                ES
              </Button>
            </div>
          </div>

          <div className="max-w-3xl pt-12 sm:pt-16">
            <p className="text-xs font-bold uppercase text-accent sm:text-sm">{text.eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-6xl">{validCode ? text.title : text.invalidTitle}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
              {validCode ? text.subtitle : text.invalidBody}
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          {validCode ? (
            <div className="mb-12 flex flex-col gap-3 border-l-4 border-accent pl-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-muted-foreground">{text.invitation}</p>
              <p className="font-mono text-2xl font-bold text-primary">{code}</p>
            </div>
          ) : null}

          {validCode ? <h2 className="max-w-2xl text-2xl font-bold text-primary sm:text-3xl">{text.stepsTitle}</h2> : null}
          {validCode ? (
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {text.steps.map((step, index) => {
                const Icon = stepIcons[index];
                return (
                  <li key={step} className="border-t-2 border-accent bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
                        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                      </span>
                      <span className="text-sm font-bold text-accent">0{index + 1}</span>
                    </div>
                    <p className="mt-6 font-semibold leading-6 text-card-foreground">{step}</p>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <Button asChild size="lg" className="mt-10 h-12 w-full bg-accent px-8 text-base font-bold text-accent-foreground hover:bg-accent/90 sm:w-auto">
            <Link
              to="/auth"
              search={validCode ? { ref: code, redirect: "/tiendas" } : { redirect: "/" }}
            >
              {validCode ? text.cta : text.invalidCta}
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}