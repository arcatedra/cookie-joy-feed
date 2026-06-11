import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getShippingSettings,
  updateShippingSettings,
} from "@/lib/shipping.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/shipping")({
  component: AdminShippingPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · Envíos" }, { name: "robots", content: "noindex" }] }),
});

function AdminShippingPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getShippingSettings);
  const saveSettings = useServerFn(updateShippingSettings);

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
    queryKey: ["admin", "shipping-settings"],
    queryFn: () => fetchSettings(),
    enabled: allowed === true,
  });

  const [enabled, setEnabled] = useState(false);
  const [base, setBase] = useState("0");
  const [perMile, setPerMile] = useState("0");

  useEffect(() => {
    if (data) {
      setEnabled(data.mile_shipping_enabled);
      setBase(String(data.shipping_base_price));
      setPerMile(String(data.shipping_price_per_mile));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          mile_shipping_enabled: enabled,
          shipping_base_price: Number(base) || 0,
          shipping_price_per_mile: Number(perMile) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["admin", "shipping-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (allowed === null) return <div className="p-8">Verificando acceso…</div>;
  if (!allowed) return <div className="p-8">No autorizado.</div>;

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configuración de envíos</h1>
        <p className="text-sm text-muted-foreground">
          Por defecto los envíos se rigen por el conteo de la suscripción activa.
          Activa esta opción solo si quieres cobrar por milla recorrida (estilo Uber).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Envíos por milla</CardTitle>
          <CardDescription>
            Cuando está apagado, la app ignora estos valores y usa el modelo de suscripción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="toggle" className="text-base">
              Activar Envíos por Milla (Estilo Uber)
            </Label>
            <Switch id="toggle" checked={enabled} onCheckedChange={setEnabled} disabled={isLoading} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base">Precio base por envío</Label>
              <Input
                id="base"
                type="number"
                step="0.01"
                min="0"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                disabled={!enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perMile">Precio por milla</Label>
              <Input
                id="perMile"
                type="number"
                step="0.01"
                min="0"
                value={perMile}
                onChange={(e) => setPerMile(e.target.value)}
                disabled={!enabled}
              />
            </div>
          </div>

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || isLoading}>
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
