import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Store, Loader2 } from "lucide-react";
import {
  registerBusiness,
  fetchMyBusiness,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from "@/lib/businesses";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/negocios/registro")({
  head: () => ({
    meta: [
      { title: "Postula tu negocio — Hazorex" },
      {
        name: "description",
        content:
          "Registra tu supermercado, tienda, panadería o farmacia en Hazorex y llega a nuevos clientes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessRegistrationPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const TYPES: BusinessType[] = ["supermercado", "tienda", "panaderia", "farmacia", "otro"];

function BusinessRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [existing, setExisting] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("tienda");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setHasAccount(!!data.user);
      if (data.user) {
        setEmail(data.user.email ?? "");
        const mine = await fetchMyBusiness();
        if (mine) setExisting(true);
      }
      setLoading(false);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim() || !email.trim()) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      await registerBusiness({
        business_name: name.trim(),
        business_type: type,
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim() || null,
      });
      toast.success("Postulación enviada. Te avisaremos cuando sea revisada.");
      navigate({ to: "/negocio" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al enviar la postulación");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-amber-100 text-amber-700">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold">Postula tu negocio</h1>
          <p className="text-sm text-muted-foreground">
            Únete a Hazorex y ofrece tus productos a nuestra red de clientes.
          </p>
        </div>
      </div>

      {!hasAccount && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          Necesitas iniciar sesión para postular tu negocio.{" "}
          <Link to="/auth" className="font-semibold text-amber-700 underline">
            Iniciar sesión
          </Link>
        </div>
      )}

      {existing && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
          Ya tienes un negocio registrado.{" "}
          <Link to="/negocio" className="font-semibold text-blue-700 underline">
            Ver estado
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre del negocio *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Tipo de negocio *">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BusinessType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {BUSINESS_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de contacto *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </Field>
          <Field label="Teléfono *">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </Field>
        </div>

        <Field label="Dirección *">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Ciudad">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting || !hasAccount || existing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar postulación"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
