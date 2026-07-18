import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { HazorexSymbol } from "@/components/HazorexLogo";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import i18n from "@/i18n";
import {
  getLoginSecurityConfig,
  preflightLogin,
  finalizeLoginAttempt,
} from "@/lib/login-security.functions";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; ref?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    ref: typeof search.ref === "string" ? search.ref.toUpperCase().slice(0, 16) : undefined,
  }),
  head: () => ({
    meta: [
      { title: i18n.t("authPage.metaTitle") },
      { name: "description", content: i18n.t("authPage.metaDesc") },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redirect, ref } = Route.useSearch();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>("");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");


  const redirectTarget = redirect && redirect.startsWith("/") ? redirect : "/";

  useEffect(() => {
    getLoginSecurityConfig()
      .then((c) => setTurnstileSiteKey(c.turnstileSiteKey ?? ""))
      .catch(() => setTurnstileSiteKey(""));
  }, []);

  const resolveRoleTarget = async (fallback: string): Promise<string> => {
    // Respect explicit redirect param when provided.
    if (redirect && redirect.startsWith("/")) return redirect;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData.user;
      if (!u) return fallback;
      const [{ data: isAdmin }, { data: isDriver }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: u.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: u.id, _role: "repartidor" }),
      ]);
      if (isAdmin) return "/admin/live";
      if (isDriver) {
        const { data: d } = await supabase
          .from("drivers")
          .select("application_status")
          .eq("id", u.id)
          .maybeSingle();
        if (d?.application_status === "aprobado") return "/repartidor";
        return "/repartidores";
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (!user) return;
    if (mfaChallenge) return; // waiting for TOTP code
    let cancelled = false;
    resolveRoleTarget(redirectTarget).then((to) => {
      if (!cancelled) navigate({ to });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mfaChallenge]);


  const validatePassword = (pw: string): string | null => {
    if (pw.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
    if (!/[A-Z]/.test(pw)) return "Incluye al menos una letra mayúscula.";
    if (!/[a-z]/.test(pw)) return "Incluye al menos una letra minúscula.";
    if (!/[0-9]/.test(pw)) return "Incluye al menos un número.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Incluye al menos un carácter especial (ej. !@#$%).";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !acceptedTerms) {
      toast.error("Debes aceptar los Términos y confirmar que es legal en tu lugar de residencia.");
      return;
    }
    if (mode === "signup") {
      const pwError = validatePassword(password);
      if (pwError) {
        toast.error(pwError);
        return;
      }
    }
    if (lockedUntil && Date.now() < lockedUntil) {
      const sec = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast.error(`Demasiados intentos. Vuelve a intentarlo en ~${Math.ceil(sec / 60)} min.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + redirectTarget,
            data: { name, region: region.trim().toUpperCase(), terms_accepted: true, referral_code: ref ?? null },
          },
        });
        if (error) throw error;
        toast.success(t("auth.checkEmail"));
      } else {
        // Pre-flight: rate-limit + captcha verification server-side.
        const pre = await preflightLogin({
          data: { email, captchaToken: captchaToken ?? undefined },
        });
        if (pre.blocked) {
          const until = Date.now() + Math.max(pre.retryAfterSec, 60) * 1000;
          setLockedUntil(until);
          toast.error(
            `Demasiados intentos fallidos. Cuenta bloqueada temporalmente por ~${Math.ceil(
              pre.retryAfterSec / 60,
            )} min.`,
          );
          return;
        }
        if (pre.requireCaptcha && !pre.ok) {
          setRequireCaptcha(true);
          setCaptchaToken(null);
          toast.error("Completa la verificación anti-bot para continuar.");
          return;
        }
        setRequireCaptcha(pre.requireCaptcha);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        const success = !error;

        // Record the outcome (fire-and-forget style, but await to keep state consistent).
        try {
          await finalizeLoginAttempt({ data: { email, success } });
        } catch {
          /* noop */
        }

        if (error) {
          const newCount = failCount + 1;
          setFailCount(newCount);
          setCaptchaToken(null);
          if (newCount >= 2) setRequireCaptcha(true);
          throw error;
        }

        setFailCount(0);
        setRequireCaptcha(false);
        setCaptchaToken(null);

        // If the account has TOTP 2FA enabled, require the code before continuing.
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
            const { data: fList } = await supabase.auth.mfa.listFactors();
            const totp = (fList?.totp ?? []).find((f) => f.status === "verified");
            if (totp) {
              const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
              if (chalErr) throw chalErr;
              setMfaChallenge({ factorId: totp.id, challengeId: chal.id });
              toast.message("Ingresa el código de 6 dígitos de tu app autenticadora.");
              return;
            }
          }
        } catch (mfaErr) {
          toast.error(mfaErr instanceof Error ? mfaErr.message : "Error verificando 2FA");
          await supabase.auth.signOut();
          return;
        }

        const to = await resolveRoleTarget(redirectTarget);
        navigate({ to });

      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      toast.error("Ingresa el código de 6 dígitos.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      });
      if (error) throw error;
      setMfaChallenge(null);
      setMfaCode("");
      const to = await resolveRoleTarget(redirectTarget);
      navigate({ to });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setBusy(false);
    }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaChallenge(null);
    setMfaCode("");
  };


  const onGoogle = async () => {
    if (mode === "signup" && !acceptedTerms) {
      toast.error("Debes aceptar los Términos y confirmar que es legal en tu lugar de residencia.");
      return;
    }
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + redirectTarget,
      extraParams: {
        prompt: "select_account",
      },
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirectTarget });
  };

  return (
    <main className="min-h-screen bg-background px-5 pb-12 pt-6">
      <Link to="/" aria-label={t("common.back")} className="inline-grid h-10 w-10 place-items-center rounded-full hover:bg-accent">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="mx-auto mt-6 max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <HazorexSymbol size={72} />
          <span className="mt-3 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-2xl font-black tracking-[0.2em] text-transparent">
            HAZOREX
          </span>
        </div>
        {mfaChallenge ? (
          <div>
            <h1 className="text-2xl font-bold text-foreground text-center">Verificación en dos pasos</h1>
            <p className="mt-1 text-sm text-muted-foreground text-center">
              Ingresa el código de 6 dígitos de tu app autenticadora.
            </p>
            <form onSubmit={onSubmitMfa} className="mt-5 space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={busy || mfaCode.length !== 6}
                className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow disabled:opacity-60"
              >
                Verificar
              </button>
              <button
                type="button"
                onClick={cancelMfa}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar e iniciar sesión con otra cuenta
              </button>
            </form>
          </div>
        ) : (<>
        <h1 className="text-2xl font-bold text-foreground text-center">
          {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">{t("auth.subtitle")}</p>


        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-input bg-card py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-accent disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 5.8 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 5.8 29.3 4 24 4 16.1 4 9.2 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.3 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.1 39.6 16 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.2 5.2C40.9 36.8 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          {t("auth.google")}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <input
                type="text"
                required
                placeholder={t("auth.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                required
                maxLength={2}
                placeholder="Estado / Región (ej. FL, CA, TX)"
                value={region}
                onChange={(e) => setRegion(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          )}
          <input
            type="email"
            required
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            required
            minLength={mode === "signup" ? 12 : 6}
            pattern={mode === "signup" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}" : undefined}
            title={mode === "signup" ? "Mínimo 12 caracteres, con mayúscula, minúscula, número y carácter especial." : undefined}
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {mode === "signup" && (
            <p className="text-[11px] text-muted-foreground -mt-1 px-1">
              Mínimo 12 caracteres, con mayúscula, minúscula, número y carácter especial.
            </p>
          )}
          {mode === "signup" && (
            <label className="flex items-start gap-2 rounded-xl border border-input bg-card p-3 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                aria-required
              />
              <span className="leading-snug">
                Acepto los{" "}
                <Link to="/terms" className="font-semibold underline">
                  Términos y Condiciones
                </Link>{" "}
                y confirmo que la participación en este sorteo es legal en mi lugar de residencia.
              </span>
            </label>
          )}
          {mode === "signin" && requireCaptcha && turnstileSiteKey && (
            <div className="pt-1">
              <p className="mb-2 text-[11px] text-muted-foreground text-center">
                Verifica que no eres un robot para continuar.
              </p>
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onToken={(t) => setCaptchaToken(t)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={
              busy ||
              (mode === "signup" && !acceptedTerms) ||
              (mode === "signin" && requireCaptcha && !captchaToken) ||
              (lockedUntil !== null && Date.now() < lockedUntil)
            }
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow active:scale-95 transition disabled:opacity-60"
          >
            {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>
        </>)}
      </div>

    </main>
  );
}
