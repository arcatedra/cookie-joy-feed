import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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

const searchSchema = z.object({
  status: z.enum(["success", "cancel"]).optional(),
  donation_id: z.string().optional(),
});

export const Route = createFileRoute("/donate")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Donar — AMYRAX" },
      {
        name: "description",
        content:
          "Apoya a AMYRAX con una donación y desbloquea insignias exclusivas: Azul, Bronce, Oro, Premium, Corona y Estrella Suprema.",
      },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  const { status, donation_id } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const startCheckout = useServerFn(createDonationCheckout);

  const [amount, setAmount] = useState<number>(20);
  const [customInput, setCustomInput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "success") {
      toast.success("¡Gracias por tu donación! Tu insignia se activará en segundos.");
      // Clean the URL.
      navigate({ to: "/donate", search: {}, replace: true });
    } else if (status === "cancel") {
      toast.info("Donación cancelada. Puedes intentarlo cuando quieras.");
      navigate({ to: "/donate", search: {}, replace: true });
    }
  }, [status, donation_id, navigate]);

  const effectiveAmount = useMemo(() => {
    const custom = parseFloat(customInput);
    if (!Number.isNaN(custom) && custom > 0) return custom;
    return amount;
  }, [amount, customInput]);

  const previewTier: DonationTier | null = tierForAmount(effectiveAmount);

  const onDonate = async () => {
    if (!user) {
      toast.error("Inicia sesión para donar.");
      navigate({ to: "/auth" });
      return;
    }
    if (!previewTier) {
      toast.error("El monto mínimo es $1 USD.");
      return;
    }
    setLoading(true);
    try {
      const result = await startCheckout({ data: { amount: effectiveAmount } });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No se recibió URL de pago.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el pago.");
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
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0f172a] px-5 py-12 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/10 backdrop-blur">
            <Heart className="h-7 w-7 text-amber-300" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Apoya a AMYRAX
          </h1>
          <p className="mt-3 text-sm text-white/80 md:text-base">
            Cada donación nos ayuda a seguir creando experiencias artesanales.
            A cambio, recibes una insignia exclusiva en tu perfil.
          </p>
        </div>
      </header>

      {/* Donation form */}
      <section className="mx-auto -mt-8 max-w-2xl px-5">
        <div className="rounded-3xl bg-card p-6 shadow-xl ring-1 ring-border md:p-8">
          <h2 className="text-base font-bold uppercase tracking-[0.12em] text-foreground">
            Elige tu monto (USD)
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
              O introduce un monto personalizado
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

          {/* Live tier preview */}
          {previewTier && (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tu insignia
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
                <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Donar ${effectiveAmount.toFixed(2)} USD
              </>
            )}
          </button>

          {!user && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              ¿Aún no tienes cuenta?{" "}
              <Link to="/auth" className="font-semibold text-primary underline">
                Inicia sesión
              </Link>{" "}
              para donar.
            </p>
          )}

          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Pagos procesados de forma segura. Entorno de pruebas activo.
          </p>
        </div>
      </section>

      {/* Tier showcase */}
      <section className="mx-auto mt-10 max-w-3xl px-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Niveles de reconocimiento
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {allTiers.map((t) => (
            <div
              key={t}
              className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-border"
            >
              <TierBadge tier={t} size="lg" />
              <p className="text-[11px] font-medium text-muted-foreground">
                {tierRange(t)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function tierRange(t: DonationTier): string {
  switch (t) {
    case "azul":
      return "$1 – $4";
    case "bronce":
      return "$5 – $19";
    case "oro":
      return "$20 – $99";
    case "premium":
      return "$100 – $499";
    case "corona":
      return "$500 exacto";
    case "estrella_suprema":
      return "$501 en adelante";
  }
}
