import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, ShieldAlert, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Factor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
};

export const Route = createFileRoute("/profile/security")({
  validateSearch: (search: Record<string, unknown>) => ({
    enforce: typeof search.enforce === "string" ? search.enforce : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Seguridad y 2FA — HAZOREX" },
      { name: "description", content: "Activa la verificación en dos pasos (2FA) para proteger tu cuenta HAZOREX." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { enforce } = Route.useSearch();

  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Enroll state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/profile/security" } });
  }, [loading, user, navigate]);

  const loadFactors = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
    } else {
      const all = [...(data?.totp ?? []), ...((data as unknown as { all?: Factor[] })?.all ?? [])];
      // Dedupe by id
      const seen = new Set<string>();
      const list = all.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
      setFactors(list);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) return;
    loadFactors();
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  const verifiedTotp = (factors ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
  const hasVerified = verifiedTotp.length > 0;

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const friendlyName = `HAZOREX ${new Date().toISOString().slice(0, 10)}`;
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
      if (error) throw error;
      if (!data?.totp) throw new Error("No TOTP data returned");
      setEnrollData({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar la inscripción");
    } finally {
      setEnrolling(false);
    }
  };

  const cancelEnroll = async () => {
    if (enrollData) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.id }).catch(() => {});
    }
    setEnrollData(null);
    setVerifyCode("");
  };

  const verifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollData) return;
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      toast.error("Ingresa el código de 6 dígitos.");
      return;
    }
    setVerifying(true);
    try {
      const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
      if (chalErr) throw chalErr;
      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: chal.id,
        code: verifyCode.trim(),
      });
      if (verErr) throw verErr;
      toast.success("2FA activado correctamente.");
      setEnrollData(null);
      setVerifyCode("");
      await loadFactors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido. Inténtalo de nuevo.");
    } finally {
      setVerifying(false);
    }
  };

  const removeFactor = async (id: string) => {
    if (!confirm("¿Desactivar 2FA para esta cuenta? Reduce la seguridad de tu cuenta.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Método 2FA eliminado.");
    await loadFactors();
  };

  const copySecret = async () => {
    if (!enrollData) return;
    try {
      await navigator.clipboard.writeText(enrollData.secret);
      toast.success("Secreto copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-24 px-5 pt-6">
      <Link to="/profile" className="inline-grid h-10 w-10 place-items-center rounded-full hover:bg-accent" aria-label="Volver">
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <div className="mx-auto mt-4 max-w-xl">
        <h1 className="text-2xl font-bold text-foreground">Seguridad y 2FA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Añade una segunda capa de protección con una app autenticadora (Google Authenticator, 1Password, Authy…).
        </p>

        {enforce === "admin" && isAdmin && !hasVerified && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">2FA obligatorio para administradores</p>
              <p className="mt-1 text-xs">
                Debes activar la verificación en dos pasos antes de acceder al panel de administración.
              </p>
            </div>
          </div>
        )}

        {/* Current status */}
        <section className="mt-6 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-3">
            {hasVerified ? (
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className="text-sm font-bold text-card-foreground">
                Estado: {hasVerified ? "2FA activado" : "2FA no activado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasVerified
                  ? "Se te pedirá un código de 6 dígitos en cada inicio de sesión."
                  : "Actívalo para proteger tu cuenta ante robo de contraseña."}
              </p>
            </div>
          </div>

          {refreshing ? (
            <p className="mt-3 text-xs text-muted-foreground">Cargando…</p>
          ) : verifiedTotp.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {verifiedTotp.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">{f.friendly_name || "App autenticadora"}</p>
                      <p className="text-[11px] text-muted-foreground">TOTP · verificado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFactor(f.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" /> Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* Enroll flow */}
        {!hasVerified && (
          <section className="mt-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            {!enrollData ? (
              <div>
                <h2 className="text-base font-bold text-card-foreground">Activar 2FA</h2>
                <ol className="mt-2 list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                  <li>Instala una app autenticadora (Google Authenticator, 1Password, Authy…).</li>
                  <li>Pulsa "Comenzar" y escanea el código QR desde la app.</li>
                  <li>Introduce el código de 6 dígitos para confirmar.</li>
                </ol>
                <button
                  type="button"
                  onClick={startEnroll}
                  disabled={enrolling}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow disabled:opacity-60"
                >
                  {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Comenzar
                </button>
              </div>
            ) : (
              <form onSubmit={verifyEnroll}>
                <h2 className="text-base font-bold text-card-foreground">Escanea el código QR</h2>
                <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-4">
                  <div
                    className="h-48 w-48 bg-white p-2 rounded"
                    // Supabase returns SVG markup as a string
                    dangerouslySetInnerHTML={{ __html: enrollData.qr }}
                  />
                  <div className="w-full">
                    <p className="text-[11px] text-muted-foreground text-center">
                      ¿No puedes escanear? Ingresa este secreto manualmente:
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-[11px] break-all">{enrollData.secret}</code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="rounded-full border border-input px-3 py-1 text-[11px] font-semibold hover:bg-accent"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>

                <label className="mt-4 block text-xs font-semibold text-foreground">
                  Código de 6 dígitos
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="••••••"
                  />
                </label>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={verifying}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow disabled:opacity-60"
                  >
                    {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verificar y activar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEnroll}
                    className="rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          Consejo: guarda tu secreto en un gestor de contraseñas como respaldo. Si pierdes acceso a la app autenticadora, contacta a soporte.
        </p>
      </div>
    </main>
  );
}
