import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Loader2, ShieldCheck, PlayCircle, Navigation2, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDriverStatus, acceptAgreement, completeTutorial, setPreferredGpsApp } from "@/lib/courier.functions";

export const Route = createFileRoute("/_authenticated/repartidor/onboarding")({
  component: OnboardingPage,
});

type Step = "agreement" | "gps" | "tutorial";

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openStep, setOpenStep] = useState<Step | null>(null);

  const status = useQuery({
    queryKey: ["courier", "driver-status"],
    queryFn: () => getDriverStatus(),
  });

  const acceptFn = useServerFn(acceptAgreement);
  const gpsFn = useServerFn(setPreferredGpsApp);
  const tutorialFn = useServerFn(completeTutorial);

  const doAccept = useMutation({
    mutationFn: () => acceptFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", "driver-status"] });
      setOpenStep(null);
      toast.success("Acuerdo aceptado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doGps = useMutation({
    mutationFn: (app: "google" | "waze" | "apple") => gpsFn({ data: { app } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", "driver-status"] });
      setOpenStep(null);
      toast.success("Preferencia guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doTutorial = useMutation({
    mutationFn: () => tutorialFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier", "driver-status"] });
      toast.success("¡Todo listo! Ya puedes empezar a repartir");
      navigate({ to: "/repartidor" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (status.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const d = status.data;
  const agreementDone = !!d?.agreement_accepted_at;
  const gpsDone = !!d?.preferred_gps_app;
  const tutorialDone = !!d?.tutorial_completed_at;
  const total = 3;
  const done = [agreementDone, gpsDone, tutorialDone].filter(Boolean).length;
  const canFinish = agreementDone && gpsDone;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="border-b border-[#c8862e]/30 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-2 flex items-center gap-2">
            <Bike className="size-5 text-[#c8862e]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#c8862e]">
              Bienvenido a Hazorex
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">Primeros pasos</h1>
          <p className="mt-1 text-sm text-[#4a3525]">
            Completa estos {total} pasos para empezar a aceptar pedidos.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#e8ddc7]">
            <div
              className="h-full bg-[#c8862e] transition-all"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[#4a3525]">{done} de {total} completados</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-3">
        <StepCard
          done={agreementDone}
          icon={<ShieldCheck className="size-5" />}
          title="Acepta el acuerdo de repartidor"
          desc="Términos y condiciones para operar como repartidor independiente."
          open={openStep === "agreement"}
          onOpen={() => setOpenStep(openStep === "agreement" ? null : "agreement")}
        >
          <div className="max-h-40 overflow-y-auto rounded-md bg-[#f4f1ea] p-3 text-xs text-[#4a3525]">
            <p className="mb-2 font-semibold">Acuerdo de repartidor independiente</p>
            <p>
              Al aceptar, confirmas que operas como contratista independiente, con licencia vigente,
              vehículo asegurado y documentos al día. Te comprometes a cumplir con las normas de tránsito,
              trato respetuoso a comercios y clientes, y las políticas de calidad de Hazorex (puntualidad,
              foto/firma de entrega, no manipulación de pedidos). Hazorex retiene una comisión sobre cada
              entrega según la tarifa vigente y realiza pagos semanales.
            </p>
          </div>
          <Button
            className="mt-3 w-full bg-[#c8862e] text-white hover:bg-[#a86e21]"
            disabled={doAccept.isPending}
            onClick={() => doAccept.mutate()}
          >
            {doAccept.isPending ? "Aceptando..." : "Acepto los términos"}
          </Button>
        </StepCard>

        <StepCard
          done={gpsDone}
          icon={<Navigation2 className="size-5" />}
          title="Elige tu app de navegación favorita"
          desc="La usaremos por defecto para abrir rutas hacia recolecciones y entregas."
          open={openStep === "gps"}
          onOpen={() => setOpenStep(openStep === "gps" ? null : "gps")}
        >
          <div className="grid grid-cols-3 gap-2">
            {(["google", "waze", "apple"] as const).map((app) => (
              <Button
                key={app}
                variant={d?.preferred_gps_app === app ? "default" : "outline"}
                onClick={() => doGps.mutate(app)}
                disabled={doGps.isPending}
                className={d?.preferred_gps_app === app ? "bg-[#1e3a5f]" : ""}
              >
                {app === "google" ? "Google Maps" : app === "waze" ? "Waze" : "Apple Maps"}
              </Button>
            ))}
          </div>
        </StepCard>

        <StepCard
          done={tutorialDone}
          icon={<PlayCircle className="size-5" />}
          title="Tutorial rápido: cómo funciona"
          desc="60 segundos para entender el flujo aceptar → recolectar → entregar."
          open={openStep === "tutorial"}
          onOpen={() => setOpenStep(openStep === "tutorial" ? null : "tutorial")}
        >
          <ol className="space-y-2 text-sm text-[#4a3525]">
            <li><span className="font-semibold text-[#1e3a5f]">1.</span> Ponte <b>en línea</b> desde el panel para empezar a recibir pedidos.</li>
            <li><span className="font-semibold text-[#1e3a5f]">2.</span> Cuando llegue un pedido, verás la dirección, distancia y ganancia estimada. Tienes 30 seg para aceptarlo.</li>
            <li><span className="font-semibold text-[#1e3a5f]">3.</span> Ve al punto de <b>recolección</b>, confirma "Recogí el pedido".</li>
            <li><span className="font-semibold text-[#1e3a5f]">4.</span> Navega al cliente, entrega y sube <b>foto, firma o código</b> como prueba.</li>
            <li><span className="font-semibold text-[#1e3a5f]">5.</span> Tu ganancia se acumula. Pagos semanales.</li>
          </ol>
          <Button
            className="mt-4 w-full bg-[#c8862e] text-white hover:bg-[#a86e21]"
            disabled={doTutorial.isPending || !canFinish}
            onClick={() => doTutorial.mutate()}
          >
            {!canFinish
              ? "Completa los pasos anteriores primero"
              : doTutorial.isPending
                ? "Guardando..."
                : "Entendido, empezar a repartir"}
          </Button>
        </StepCard>
      </main>
    </div>
  );
}

function StepCard({
  done,
  icon,
  title,
  desc,
  open,
  onOpen,
  children,
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  open: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-2 transition ${done ? "border-emerald-500/40 bg-emerald-50/30" : "border-[#c8862e]/20"}`}>
      <CardContent className="p-4">
        <button className="flex w-full items-start gap-3 text-left" onClick={onOpen}>
          <div className={`mt-0.5 shrink-0 ${done ? "text-emerald-600" : "text-[#c8862e]"}`}>
            {done ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[#1e3a5f]">
              {icon}
              <h3 className="font-serif font-bold">{title}</h3>
            </div>
            <p className="mt-1 text-sm text-[#4a3525]">{desc}</p>
          </div>
        </button>
        {open && !done && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}
