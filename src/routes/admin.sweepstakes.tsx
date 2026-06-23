import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getSweepstakesConfig,
  updateSweepstakesConfig,
} from "@/lib/sweepstakes-config.functions";
import { triggerTestDraw, sendSmokeTestWinnerEmail } from "@/lib/admin-draw.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/sweepstakes")({
  component: AdminSweepstakesPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin · Sorteo" }, { name: "robots", content: "noindex" }],
  }),
});

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function AdminSweepstakesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const fetchConfig = useServerFn(getSweepstakesConfig);
  const saveConfig = useServerFn(updateSweepstakesConfig);
  const runDraw = useServerFn(triggerTestDraw);
  const sendSmokeEmail = useServerFn(sendSmokeTestWinnerEmail);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: u.user.id,
        _role: "admin",
      });
      if (!cancelled) setAllowed(Boolean(isAdmin));
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sweepstakes-config"],
    queryFn: () => fetchConfig(),
    enabled: allowed === true,
  });

  const [sponsorName, setSponsorName] = useState("");
  const [sponsorAddress, setSponsorAddress] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [maxPrize, setMaxPrize] = useState<number>(4999);
  const [excluded, setExcluded] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setSponsorName(data.sponsor_name ?? "");
      setSponsorAddress(data.sponsor_address ?? "");
      setSponsorEmail(data.sponsor_email ?? "");
      setMaxPrize(Number(data.max_daily_prize_usd ?? 4999));
      setExcluded((data.excluded_states ?? []) as string[]);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveConfig({
        data: {
          sponsor_name: sponsorName,
          sponsor_address: sponsorAddress,
          sponsor_email: sponsorEmail,
          max_daily_prize_usd: Number(maxPrize),
          excluded_states: excluded,
        },
      }),
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["admin", "sweepstakes-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drawMut = useMutation({
    mutationFn: () => runDraw(),
    onSuccess: (res) => {
      if (!res.ok) {
        if (res.error?.includes("SPONSOR_ADDRESS_NOT_CONFIGURED")) {
          toast.error("La dirección del Sponsor no está configurada. Actualízala antes de ejecutar el sorteo.");
        } else {
          toast.error(res.error ?? "Error al ejecutar el sorteo");
        }
        return;
      }
      toast.success(
        res.status === "completed"
          ? `Sorteo completado · Ganador: ${res.winnerDisplayName ?? "—"}`
          : `Sorteo: ${res.status}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [smokeEmail, setSmokeEmail] = useState("");
  const [smokeName, setSmokeName] = useState("Smoke Test");
  const smokeMut = useMutation({
    mutationFn: () =>
      sendSmokeEmail({ data: { email: smokeEmail.trim(), displayName: smokeName.trim() || undefined } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error ?? "Error en smoke test");
        return;
      }
      toast.success(`Email encolado a ${res.recipient}. Revisa la bandeja en ~10s.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (allowed === null) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>Solo administradores.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const addressValid = data?.address_valid ?? false;
  const dirty =
    !!data &&
    (sponsorName !== data.sponsor_name ||
      sponsorAddress !== data.sponsor_address ||
      sponsorEmail !== data.sponsor_email ||
      Number(maxPrize) !== Number(data.max_daily_prize_usd) ||
      JSON.stringify([...excluded].sort()) !== JSON.stringify([...(data.excluded_states as string[] ?? [])].sort()));

  const toggleState = (s: string) =>
    setExcluded((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const capWarning = Number(maxPrize) >= 5000;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Sorteo</h1>
          <p className="text-sm text-muted-foreground">
            Datos legales del Sponsor + cap de premio + estados excluidos (obligatorios para operar en EE.UU.).
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/admin/sweepstakes/winners" className="underline text-muted-foreground">
            Reclamos de ganadores →
          </Link>
          <Link to="/admin/shipping" className="underline text-muted-foreground">
            Envíos →
          </Link>
        </div>
      </div>

      {!isLoading && !addressValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dirección del Sponsor no configurada</AlertTitle>
          <AlertDescription>
            El sorteo diario y la inscripción de boletos están <strong>bloqueados</strong> hasta que se complete una
            dirección física válida. La venta de Estrellas y la ruleta de cupones siguen activas.
          </AlertDescription>
        </Alert>
      )}
      {!isLoading && addressValid && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Configuración válida</AlertTitle>
          <AlertDescription>El sorteo diario puede ejecutarse.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sponsor</CardTitle>
          <CardDescription>Aparece en las Reglas Oficiales y en los emails al ganador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor_name">Razón social</Label>
            <Input id="sponsor_name" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} maxLength={200} placeholder="HAZOREX ORIGEN LLC" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor_address">Dirección física *</Label>
            <Textarea id="sponsor_address" value={sponsorAddress} onChange={(e) => setSponsorAddress(e.target.value)} maxLength={500} rows={3} placeholder="123 Main St, Suite 100, Miami, FL 33101, USA" />
            <p className="text-xs text-muted-foreground">Debe ser una dirección postal real en EE.UU. (sin corchetes ni "COMPLETAR").</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor_email">Email de soporte</Label>
            <Input id="sponsor_email" type="email" value={sponsorEmail} onChange={(e) => setSponsorEmail(e.target.value)} maxLength={200} placeholder="soporte@hazorex.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cap del Premio Diario (USD)</CardTitle>
          <CardDescription>
            Tope máximo del premio entregado por sorteo. El excedente se acumula al próximo día.
            Mantener este valor &lt; $5,000 evita el requisito de registro/bond en CA/FL/NY/RI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="number" min={1} max={1000000} step={1} value={maxPrize} onChange={(e) => setMaxPrize(Number(e.target.value || 0))} />
          {capWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cap ≥ $5,000</AlertTitle>
              <AlertDescription>
                Subir el cap a $5,000 USD o más activa requisitos de registro estatal en CA, FL, NY y RI antes de poder
                operar legalmente con esos premios. Consulta a un abogado de sweepstakes antes de subir el cap.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estados excluidos</CardTitle>
          <CardDescription>
            Los residentes de estos estados NO pueden inscribir boletos (ni gratis ni pagados).
            La compra de Estrellas no se restringe geográficamente — es un producto digital.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Por defecto excluye FL, NY, RI</AlertTitle>
            <AlertDescription>
              Quitar uno de estos estados requiere registro previo y bond (fianza) en ese estado antes de aceptar
              participantes. No los quites sin asesoramiento legal.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {US_STATES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleState(s)}
                className={`rounded border px-2 py-1 text-xs font-semibold transition ${
                  excluded.includes(s)
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-background text-foreground border-input hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejecutar sorteo manual</CardTitle>
          <CardDescription>Útil para pruebas. El cron automático corre todos los días a las 8:00 PM ET.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={drawMut.isPending}>
                {drawMut.isPending ? "Ejecutando…" : "Ejecutar sorteo ahora"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar ejecución del sorteo?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    {!addressValid && (
                      <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive">
                        ⚠ La dirección del Sponsor NO está configurada. El sorteo será rechazado.
                      </div>
                    )}
                    <div>
                      Esta acción seleccionará un ganador del día actual de forma irreversible y enviará el correo de
                      notificación.
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => drawMut.mutate()} disabled={!addressValid}>
                  Sí, ejecutar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
