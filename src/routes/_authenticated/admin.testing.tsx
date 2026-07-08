import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkIsAdmin } from "@/lib/admin-draw.functions";
import {
  adminActivateTestSubscription,
  adminDeactivateTestSubscription,
} from "@/lib/admin-dev.functions";

export const Route = createFileRoute("/_authenticated/admin/testing")({
  component: AdminTestingPage,
});

function AdminTestingPage() {
  const navigate = useNavigate();
  const isAdminFn = useServerFn(checkIsAdmin);
  const activateFn = useServerFn(adminActivateTestSubscription);
  const deactivateFn = useServerFn(adminDeactivateTestSubscription);

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => isAdminFn() });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"activate" | "deactivate" | null>(null);

  useEffect(() => {
    if (adminQ.data && adminQ.data.isAdmin === false) {
      toast.error("Solo administradores");
      navigate({ to: "/" });
    }
  }, [adminQ.data, navigate]);

  if (adminQ.isLoading || !adminQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!adminQ.data.isAdmin) return null;

  const submit = async (kind: "activate" | "deactivate") => {
    if (!email.trim()) {
      toast.error("Ingresa un correo");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "activate") {
        await activateFn({ data: { email: email.trim() } });
        toast.success(`Starter Plan de prueba activado para ${email}`);
      } else {
        const r = await deactivateFn({ data: { email: email.trim() } });
        toast.success(`Suscripciones de prueba eliminadas: ${r.removed}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló la operación");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical className="size-5 text-primary" />
            <h1 className="text-lg font-bold">Testing tools (admin)</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Herramienta de desarrollo.</strong> Activa o desactiva un
          Starter Plan <em>de prueba</em> (sin cobrar) para cualquier usuario
          por correo. Solo funciona en modo sandbox de Stripe y solo para
          administradores. No usar en producción real.
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <label className="block text-sm font-medium">Correo del usuario</label>
            <Input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={busy !== null}
                onClick={() => submit("activate")}
              >
                {busy === "activate" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Activar Starter Plan de prueba
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy !== null}
                onClick={() => submit("deactivate")}
              >
                {busy === "deactivate" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Quitar suscripción de prueba
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              La activación inserta una fila en <code>subscriptions</code> con
              <code>stripe_subscription_id</code> que empieza por
              <code>test_manual_</code>. La desactivación solo elimina esas
              filas — nunca toca suscripciones reales de Stripe.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
