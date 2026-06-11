import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  exportShippingQuotesCSV,
  getShippingSettings,
  listShippingQuotes,
  updateShippingSettings,
} from "@/lib/shipping.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  // Filters state
  const [userQuery, setUserQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "saved" | "failed">("all");

  const fetchHistory = useServerFn(listShippingQuotes);
  const { data: history } = useQuery({
    queryKey: ["admin", "shipping-quotes", userQuery, dateFrom, dateTo, statusFilter],
    queryFn: () =>
      fetchHistory({
        data: {
          userQuery: userQuery.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      }),
    enabled: allowed === true,
    refetchInterval: 15_000,
  });

  const clearFilters = () => {
    setUserQuery("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
  };

  if (allowed === null) return <div className="p-8">Verificando acceso…</div>;
  if (!allowed) return <div className="p-8">No autorizado.</div>;

  return (
    <div className="container max-w-5xl py-10 space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Historial de cotizaciones</CardTitle>
          <CardDescription>
            Cotizaciones guardadas y fallidas. Usa los filtros para buscar por usuario, fechas o estado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label htmlFor="userFilter">Usuario</Label>
              <Input
                id="userFilter"
                placeholder="Nombre o ID de usuario"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFrom">Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo">Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="statusFilter">Estado</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger id="statusFilter" className="w-[160px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="saved">Guardadas</SelectItem>
                  <SelectItem value="failed">Fallidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>

          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay cotizaciones registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Millas</TableHead>
                    <TableHead className="text-right">$/milla</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(q.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate" title={q.userName ?? q.userId}>
                        {q.userName ?? q.userId.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {q.from.lat.toFixed(3)}, {q.from.lng.toFixed(3)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {q.to.lat.toFixed(3)}, {q.to.lng.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">{q.distanceMiles.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${q.pricePerMile.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${q.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={q.status === "saved" ? "default" : "destructive"}>
                          {q.status === "saved" ? "Guardada" : "Fallida"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {q.errorMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}