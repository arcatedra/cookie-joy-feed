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
import { triggerTestDraw } from "@/lib/admin-draw.functions";
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

function AdminSweepstakesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const fetchConfig = useServerFn(getSweepstakesConfig);
  const saveConfig = useServerFn(updateSweepstakesConfig);
  const runDraw = useServerFn(triggerTestDraw);

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

  useEffect(() => {
    if (data) {
      setSponsorName(data.sponsor_name ?? "");
      setSponsorAddress(data.sponsor_address ?? "");
      setSponsorEmail(data.sponsor_email ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveConfig({
        data: {
          sponsor_name: sponsorName,
          sponsor_address: sponsorAddress,
          sponsor_email: sponsorEmail,
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
      sponsorEmail !== data.sponsor_email);

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Sorteo</h1>
          <p className="text-sm text-muted-foreground">
            Datos legales del Sponsor (obligatorios para operar el sorteo en EE.UU.).
          </p>
        </div>
        <Link to="/admin/shipping" className="text-sm underline text-muted-foreground">
          Envíos →
        </Link>
      </div>

      {!isLoading && !addressValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dirección del Sponsor no configurada</AlertTitle>
          <AlertDescription>
            El sorteo diario está <strong>bloqueado</strong> hasta que se complete una dirección
            física válida. El cron de las 8:00 PM ET fallará y los premios se acumularán.
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
          <CardDescription>
            Aparece en las reglas oficiales y en los emails al ganador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor_name">Razón social</Label>
            <Input
              id="sponsor_name"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              maxLength={200}
              placeholder="HAZOREX ORIGEN LLC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor_address">Dirección física *</Label>
            <Textarea
              id="sponsor_address"
              value={sponsorAddress}
              onChange={(e) => setSponsorAddress(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="123 Main St, Suite 100, Miami, FL 33101, USA"
            />
            <p className="text-xs text-muted-foreground">
              Debe ser una dirección postal real en EE.UU. No se permiten marcadores
              entre corchetes ni la palabra "COMPLETAR".
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor_email">Email de soporte</Label>
            <Input
              id="sponsor_email"
              type="email"
              value={sponsorEmail}
              onChange={(e) => setSponsorEmail(e.target.value)}
              maxLength={200}
              placeholder="soporte@hazorex.com"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejecutar sorteo manual</CardTitle>
          <CardDescription>
            Útil para pruebas. El cron automático corre todos los días a las 8:00 PM ET.
          </CardDescription>
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
                        ⚠ La dirección del Sponsor NO está configurada. El sorteo será
                        rechazado por la base de datos.
                      </div>
                    )}
                    <div>
                      Esta acción seleccionará un ganador del día actual de forma
                      irreversible y enviará el correo de notificación.
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => drawMut.mutate()}
                  disabled={!addressValid}
                >
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
