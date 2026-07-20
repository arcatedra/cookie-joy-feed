import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyCliente, upsertMyCliente } from "@/lib/clientes.functions";
import { getMySuscripcion } from "@/lib/pedidos.functions";
import { createBillingPortalSession } from "@/lib/subscriptions.functions";

export const Route = createFileRoute("/_authenticated/mi-cuenta")({
  head: () => ({
    meta: [{ title: "Mi cuenta — HAZOREX" }],
  }),
  component: MiCuentaPage,
});

function MiCuentaPage() {
  const fetchCliente = useServerFn(getMyCliente);
  const saveCliente = useServerFn(upsertMyCliente);
  const fetchSub = useServerFn(getMySuscripcion);
  const openPortal = useServerFn(createBillingPortalSession);

  const { data: cliente, refetch, isLoading } = useQuery({
    queryKey: ["cliente", "me"],
    queryFn: () => fetchCliente(),
  });
  const { data: sub, refetch: refetchSub } = useQuery({
    queryKey: ["suscripcion", "me"],
    queryFn: () => fetchSub(),
  });

  const [form, setForm] = useState({
    nombre_completo: "",
    telefono: "",
    direccion_linea1: "",
    direccion_linea2: "",
    ciudad: "",
    estado_provincia: "",
    codigo_postal: "",
    pais: "US",
  });

  useEffect(() => {
    if (!cliente) return;
    setForm({
      nombre_completo: (cliente.nombre_completo as string) ?? "",
      telefono: (cliente.telefono as string) ?? "",
      direccion_linea1: (cliente.direccion_linea1 as string) ?? "",
      direccion_linea2: (cliente.direccion_linea2 as string) ?? "",
      ciudad: (cliente.ciudad as string) ?? "",
      estado_provincia: (cliente.estado_provincia as string) ?? "",
      codigo_postal: (cliente.codigo_postal as string) ?? "",
      pais: (cliente.pais as string) ?? "US",
    });
  }, [cliente]);

  const [saving, setSaving] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCliente({ data: form });
      toast.success("Datos guardados");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>
      <p className="text-sm text-muted-foreground">
        {(cliente?.email as string) ?? ""}
      </p>

      <section className="border rounded-lg p-4 bg-card">
        <h2 className="font-semibold mb-3">Suscripción</h2>
        {sub ? (
          <div className="text-sm space-y-1">
            <div>Plan: <strong>{sub.plan}</strong></div>
            <div>
              Estado:{" "}
              <strong className={estadoClass(sub.estado)}>{estadoLabel(sub.estado)}</strong>
            </div>
            <div>Precio: ${Number(sub.precio).toFixed(2)} {sub.moneda}</div>
            {sub.fecha_inicio && (
              <div>
                Activa desde:{" "}
                <strong>{new Date(sub.fecha_inicio).toLocaleDateString()}</strong>
              </div>
            )}
            {sub.fecha_renovacion && sub.estado !== "cancelada" && (
              <div>Próxima renovación: {new Date(sub.fecha_renovacion).toLocaleDateString()}</div>
            )}
            {sub.fecha_cancelacion && (
              <div>Cancelada el: {new Date(sub.fecha_cancelacion).toLocaleDateString()}</div>
            )}
            {sub.estado === "activa" || sub.estado === "pausada" ? (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await openPortal();
                      window.open(res.url, "_blank", "noopener");
                      toast.info("Se abrió el portal de Stripe. Vuelve aquí y refresca cuando termines.");
                      setTimeout(() => { refetchSub(); }, 4000);
                    } catch (err) {
                      toast.error((err as Error).message || "No se pudo abrir el portal");
                    }
                  }}
                  className="rounded border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5"
                >
                  Cancelar o gestionar suscripción
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm">
            No tienes suscripción activa.{" "}
            <Link to="/subscribe" className="underline">Suscribirme</Link>
          </div>
        )}
      </section>

      <form onSubmit={onSubmit} className="space-y-4 border rounded-lg p-4 bg-card">
        <h2 className="font-semibold">Datos de envío</h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <>
            <Field label="Nombre completo" value={form.nombre_completo}
              onChange={(v) => setForm({ ...form, nombre_completo: v })} />
            <Field label="Teléfono" value={form.telefono}
              onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Dirección" value={form.direccion_linea1}
              onChange={(v) => setForm({ ...form, direccion_linea1: v })} />
            <Field label="Apto / Suite (opcional)" value={form.direccion_linea2}
              onChange={(v) => setForm({ ...form, direccion_linea2: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" value={form.ciudad}
                onChange={(v) => setForm({ ...form, ciudad: v })} />
              <Field label="Estado" value={form.estado_provincia}
                onChange={(v) => setForm({ ...form, estado_provincia: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código postal" value={form.codigo_postal}
                onChange={(v) => setForm({ ...form, codigo_postal: v })} />
              <Field label="País" value={form.pais}
                onChange={(v) => setForm({ ...form, pais: v.toUpperCase().slice(0, 2) })} />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )}
      </form>

      <Link to="/mis-pedidos" className="block text-center underline">
        Ver mis pedidos →
      </Link>
    </div>
  );
}


function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground">{label}</span>
      <input
        className="w-full border rounded px-3 py-2 bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
