import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Car, DollarSign, Clock, ShieldCheck, FileCheck2, ChevronRight, Loader2, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/repartidores")({
  head: () => ({
    meta: [
      { title: "Sé repartidor · Hazorex" },
      {
        name: "description",
        content:
          "Únete al equipo de repartidores de Hazorex. Postúlate en minutos, elige tus horarios y gana dinero entregando pedidos en tu ciudad.",
      },
      { property: "og:title", content: "Sé repartidor · Hazorex" },
      {
        property: "og:description",
        content:
          "Postúlate como repartidor de Hazorex. Horarios flexibles, pagos semanales y proceso de aprobación transparente.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hazorex.com/repartidores" },
    ],
    links: [{ rel: "canonical", href: "https://hazorex.com/repartidores" }],
  }),
  component: RepartidoresLanding,
});

type DriverRow = {
  application_status: "pendiente" | "en_revision" | "aprobado" | "rechazado" | "suspendido";
  rejection_reason: string | null;
};

function RepartidoresLanding() {
  const { user, loading: authLoading } = useAuth();

  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ["driver-application", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DriverRow | null> => {
      const { data, error } = await supabase
        .from("drivers")
        .select("application_status, rejection_reason")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as DriverRow | null;
    },
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#c8862e]/30 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0f2338] text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
          <Badge className="mb-4 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#E6C35C]">
            Programa de repartidores
          </Badge>
          <h1 className="font-serif text-4xl font-black leading-tight md:text-6xl">
            Gana dinero repartiendo con{" "}
            <span className="text-[#E6C35C]">Hazorex</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85 md:text-xl">
            Horarios flexibles, pagos semanales y un proceso de aprobación transparente.
            Elige tu vehículo, sube tus documentos y empieza a repartir.
          </p>

          <div className="mt-8">
            <ApplyCta
              authLoading={authLoading}
              isLoggedIn={!!user}
              driver={driver ?? null}
              driverLoading={driverLoading}
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#E6C35C]" /> Horarios flexibles
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-[#E6C35C]" /> Pagos semanales
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#E6C35C]" /> Proceso verificado
            </div>
          </div>
        </div>
      </section>

      {/* VEHÍCULOS */}
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <h2 className="mb-2 text-center font-serif text-3xl font-bold">
          Reparte con lo que tengas
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-[#4a3525]">
          Aceptamos varios tipos de vehículo. Solo pedimos documentos según lo que uses.
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Bike, label: "Bicicleta" },
            { icon: Bike, label: "Moto" },
            { icon: Car, label: "Auto" },
            { icon: Footprints, label: "A pie" },
          ].map(({ icon: Icon, label }) => (
            <Card key={label} className="border-[#c8862e]/30 bg-white">
              <CardContent className="flex flex-col items-center gap-3 p-6">
                <div className="grid size-14 place-items-center rounded-full bg-[#1e3a5f] text-[#E6C35C]">
                  <Icon className="size-7" />
                </div>
                <p className="font-serif text-sm font-semibold text-[#1e3a5f]">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="border-t border-[#c8862e]/20 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold">Cómo funciona</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                title: "Postúlate",
                body: "Completa tus datos, elige tu vehículo y sube los documentos que te pedimos.",
                icon: FileCheck2,
              },
              {
                n: 2,
                title: "Te revisamos",
                body: "Nuestro equipo verifica tu información en pocos días. Te avisamos por email.",
                icon: ShieldCheck,
              },
              {
                n: 3,
                title: "Empieza a ganar",
                body: "Una vez aprobado, activa tu disponibilidad y recibe pedidos cerca de ti.",
                icon: DollarSign,
              },
            ].map(({ n, title, body, icon: Icon }) => (
              <li key={n} className="relative rounded-2xl border border-[#c8862e]/20 bg-[#f4f1ea] p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#1e3a5f] font-bold text-[#E6C35C]">
                    {n}
                  </span>
                  <Icon className="size-5 text-[#1e3a5f]" />
                </div>
                <h3 className="mb-1 font-serif text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-[#4a3525]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* REQUISITOS */}
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-center font-serif text-3xl font-bold">Requisitos</h2>
        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="p-6 md:p-8">
            <ul className="grid gap-4 md:grid-cols-2">
              {[
                "Ser mayor de 18 años",
                "Identificación oficial vigente",
                "Constancia de no antecedentes penales",
                "Foto de perfil clara (selfie)",
                "Licencia de conducir vigente (si usas moto o auto)",
                "Seguro del vehículo vigente (si usas moto o auto)",
              ].map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[#1e3a5f] text-[10px] font-bold text-[#E6C35C]">
                    ✓
                  </span>
                  <span className="text-sm text-[#4a3525]">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#c8862e]/20 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
          <h2 className="mb-8 text-center font-serif text-3xl font-bold">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Necesito tener un vehículo propio?",
                a: "No necesariamente. Puedes repartir a pie o en bicicleta si trabajas en zonas cercanas. Para moto o auto sí te pediremos licencia y seguro.",
              },
              {
                q: "¿Cuánto tarda la aprobación?",
                a: "Normalmente entre 2 y 5 días hábiles desde que subes todos tus documentos.",
              },
              {
                q: "¿Cuándo cobro?",
                a: "Los pagos se procesan semanalmente por el total de entregas completadas.",
              },
              {
                q: "¿Puedo elegir mis horarios?",
                a: "Sí. Tú activas tu disponibilidad cuando quieres recibir pedidos.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-xl border border-[#c8862e]/30 bg-[#f4f1ea] p-4"
              >
                <summary className="cursor-pointer list-none font-serif font-semibold text-[#1e3a5f]">
                  <span className="flex items-center justify-between gap-3">
                    {q}
                    <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#4a3525]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#1e3a5f] text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center md:px-6">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            ¿Listo para empezar?
          </h2>
          <p className="mt-3 text-white/80">
            Postúlate hoy y te avisamos apenas revisemos tu solicitud.
          </p>
          <div className="mt-6 flex justify-center">
            <ApplyCta
              authLoading={authLoading}
              isLoggedIn={!!user}
              driver={driver ?? null}
              driverLoading={driverLoading}
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ApplyCta({
  authLoading,
  isLoggedIn,
  driver,
  driverLoading,
}: {
  authLoading: boolean;
  isLoggedIn: boolean;
  driver: DriverRow | null;
  driverLoading: boolean;
}) {
  if (authLoading || (isLoggedIn && driverLoading)) {
    return (
      <Button size="lg" disabled className="bg-[#E6C35C] text-[#1e3a5f]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Cargando…
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        asChild
        size="lg"
        className="bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
      >
        <Link
          to="/auth"
          search={{ redirect: "/repartidores" }}
        >
          Postularme
        </Link>
      </Button>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          disabled
          className="bg-[#E6C35C] text-[#1e3a5f] opacity-80"
          title="Muy pronto"
        >
          Empezar postulación
        </Button>
        <span className="text-xs text-white/70">
          El formulario de postulación estará disponible muy pronto.
        </span>
      </div>
    );
  }

  // Ya tiene una postulación
  const status = driver.application_status;

  if (status === "aprobado") {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          asChild
          size="lg"
          className="bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
        >
          <Link to="/">Ir a mi panel</Link>
        </Button>
        <span className="text-xs text-white/70">
          Panel del repartidor: muy pronto.
        </span>
      </div>
    );
  }

  const label: Record<string, { text: string; tone: string }> = {
    pendiente: { text: "Postulación pendiente", tone: "bg-amber-500/20 text-amber-100 border-amber-400/40" },
    en_revision: { text: "En revisión", tone: "bg-amber-500/20 text-amber-100 border-amber-400/40" },
    rechazado: { text: "Postulación rechazada", tone: "bg-red-500/20 text-red-100 border-red-400/40" },
    suspendido: { text: "Cuenta suspendida", tone: "bg-red-500/20 text-red-100 border-red-400/40" },
  };
  const cur = label[status] ?? label.pendiente;

  return (
    <div className="flex max-w-md flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-center backdrop-blur">
      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${cur.tone}`}>
        {cur.text}
      </div>
      {status === "rechazado" && driver.rejection_reason && (
        <p className="text-sm text-white/80">
          Motivo: <span className="italic">{driver.rejection_reason}</span>
        </p>
      )}
      {(status === "pendiente" || status === "en_revision") && (
        <p className="text-sm text-white/80">
          Te avisaremos por email cuando terminemos de revisar tu solicitud.
        </p>
      )}
    </div>
  );
}
