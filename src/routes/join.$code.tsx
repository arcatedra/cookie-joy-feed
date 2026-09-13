import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Gift, Share2, UserPlus } from "lucide-react";
import { HazorexLogo } from "@/components/HazorexLogo";
import { Button } from "@/components/ui/button";

const REF_COOKIE = "hazorex_ref";
const NINETY_DAYS = 60 * 60 * 24 * 90;

export const Route = createFileRoute("/join/$code")({
  beforeLoad: async ({ params }) => {
    const ref = params.code.toUpperCase().slice(0, 16);

    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(ref)) return;

    if (typeof window === "undefined") {
      try {
        const mod = "@/lib/join-cookie.server";
        const { setReferralCookie } = await import(/* @vite-ignore */ mod);
        setReferralCookie(ref);
      } catch {
        // Non-fatal: client fallback below still runs on hydration.
      }
    } else {
      document.cookie = `${REF_COOKIE}=${ref}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax; Secure`;
    }
  },
  head: () => ({
    meta: [
      { title: "Join the HAZOREX Club — Invitation" },
      {
        name: "description",
        content: "Join the HAZOREX monthly subscription club through a friend's invitation.",
      },
      { property: "og:title", content: "Join the HAZOREX Club — Invitation" },
      {
        property: "og:description",
        content: "Discover the HAZOREX monthly subscription club through a friend's invitation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralLandingPage,
});

type LandingLanguage = "en" | "es";

const copy = {
  en: {
    eyebrow: "A FRIEND INVITED YOU",
    title: "Share the Experience. Multiply the Flavor.",
    subtitle:
      "Invite 4 friends to join our monthly subscription club. Once they complete their registration, you'll unlock 2 exclusive free deliveries as our thank you.",
    stepsTitle: "How it works",
    steps: [
      "Share your unique code.",
      "Your friends join the club.",
      "Enjoy your free deliveries.",
    ],
    cta: "Join the club",
    invalidTitle: "This invitation link has expired",
    invalidBody: "You can still create an account and discover HAZOREX.",
    invalidCta: "Continue to HAZOREX",
    codeLabel: "Invitation code",
  },
  es: {
    eyebrow: "UN AMIGO TE INVITÓ",
    title: "Comparte la Experiencia. Multiplica el Sabor.",
    subtitle:
      "Invita a 4 amigos a nuestro club de suscripción mensual. Cuando se suscriban, desbloquearás 2 entregas exclusivas gratis.",
    stepsTitle: "Cómo funciona",
    steps: [
      "Comparte tu código único.",
      "Tus amigos se unen al club.",
      "Disfruta tus entregas gratis.",
    ],
    cta: "Únete al club",
    invalidTitle: "Este enlace de invitación ha vencido",
    invalidBody: "Aún puedes crear una cuenta y descubrir HAZOREX.",
    invalidCta: "Continuar a HAZOREX",
    codeLabel: "Código de invitación",
  },
} as const;

const stepIcons = [Share2, UserPlus, Gift] as const;

function ReferralLandingPage() {
  const { code: rawCode } = Route.useParams();
  const code = rawCode.toUpperCase().slice(0, 16);
  const validCode = /^[A-HJ-NP-Z2-9]{8}$/.test(code);
  const [language, setLanguage] = useState<LandingLanguage>("en");
  const text = copy[language];

  useEffect(() => {
    if (!validCode) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${REF_COOKIE}=${code}; path=/; max-age=${NINETY_DAYS}; SameSite=Lax${secure}`;
  }, [code, validCode]);

  return (
    <main lang={language} className="relative min-h-screen overflow-hidden bg-secondary text-secondary-foreground">
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-start justify-between gap-4">
          <Link to="/" aria-label="HAZOREX home" className="inline-flex">
            <HazorexLogo size={54} className="max-w-[150px]" />
          </Link>

          <div
            className="inline-flex rounded-md border border-secondary-foreground/20 bg-secondary-foreground/5 p-1"
            aria-label="Language selector"
          >
            {(["en", "es"] as const).map((lang) => (
              <Button
                key={lang}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                className={`h-8 min-w-10 px-2 font-bold uppercase ${
                  language === lang
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "text-secondary-foreground/70 hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                }`}
              >
                {lang}
              </Button>
            ))}
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10 text-center sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{text.eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-secondary-foreground sm:text-5xl lg:text-6xl">
            {validCode ? text.title : text.invalidTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary-foreground/75 sm:text-lg sm:leading-8">
            {validCode ? text.subtitle : text.invalidBody}
          </p>

          {validCode ? (
            <>
              <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
                <Check className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-secondary-foreground/65">{text.codeLabel}</span>
                <strong className="font-mono text-secondary-foreground">{code}</strong>
              </div>

              <div className="mt-10 border-y border-secondary-foreground/15 py-7">
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-secondary-foreground/60">
                  {text.stepsTitle}
                </h2>
                <ol className="mt-6 grid gap-6 text-left sm:grid-cols-3 sm:gap-8">
                  {text.steps.map((step, index) => {
                    const Icon = stepIcons[index];
                    return (
                      <li key={step} className="flex items-center gap-4 sm:flex-col sm:text-center">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 text-accent">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="text-sm font-semibold leading-6 text-secondary-foreground">
                          {index + 1}. {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          ) : null}

          <Button asChild size="lg" className="mx-auto mt-9 h-13 w-full max-w-sm bg-accent px-8 text-base font-bold text-accent-foreground hover:bg-accent/90">
            <Link
              to="/auth"
              search={validCode ? { ref: code, redirect: "/subscribe" } : { redirect: "/" }}
            >
              {validCode ? text.cta : text.invalidCta}
            </Link>
          </Button>
        </section>

        <p className="text-center text-xs text-secondary-foreground/45">HAZOREX · Fresh moments, delivered.</p>
      </div>
    </main>
  );
}
