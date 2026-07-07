import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader, ArrowLeft } from "lucide-react";
import {
  registerBusiness,
  fetchMyBusiness,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from "@/lib/businesses";
import { NYC_DELIVERY_ZONES } from "@/lib/nyc-zones";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/negocios/registro")({
  head: () => ({
    meta: [
      { title: "Postula tu negocio — Hazorex" },
      {
        name: "description",
        content:
          "Registra tu supermercado, tienda, panadería o farmacia en Hazorex y llega a miles de clientes.",
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

type FormState = {
  business_name: string;
  business_type: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
};

const INITIAL: FormState = {
  business_name: "",
  business_type: "supermercado",
  email: "",
  phone: "",
  address: "",
  city: "",
};

function BusinessRegistrationPage() {
  const navigate = useNavigate();
  const [bootLoading, setBootLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [existing, setExisting] = useState(false);
  const [formData, setFormData] = useState<FormState>(INITIAL);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setHasAccount(!!data.user);
      if (data.user) {
        setFormData((f) => ({ ...f, email: data.user!.email ?? "" }));
        const mine = await fetchMyBusiness();
        if (mine) setExisting(true);
      }
      setBootLoading(false);
    })();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.business_name.trim()) return setError("El nombre del negocio es obligatorio"), false;
    if (!formData.email.trim()) return setError("El correo electrónico es obligatorio"), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Ingresa un correo válido"), false;
    if (!formData.phone.trim()) return setError("El teléfono es obligatorio"), false;
    if (formData.phone.replace(/\D/g, "").length < 10) return setError("El teléfono debe tener 10 dígitos (formato EE. UU.)"), false;
    if (!formData.address.trim()) return setError("La dirección es obligatoria"), false;
    if (!formData.city.trim()) return setError("La ciudad es obligatoria"), false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!hasAccount) {
      setError("Debes iniciar sesión para registrar un negocio");
      return;
    }
    if (existing) {
      setError("Ya tienes un negocio registrado");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerBusiness({
        business_name: formData.business_name.trim(),
        business_type: formData.business_type,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim() || null,
      });
      setSubmitted(true);
      setFormData(INITIAL);
    } catch (err: any) {
      setError(err?.message ?? "Error al registrar el negocio");
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-9 w-9" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">¡Solicitud enviada!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu negocio ha sido registrado correctamente. Revisaremos tu solicitud en las próximas
            48 horas y te notificaremos al correo que proporcionaste.
          </p>
          <div className="mt-5 rounded-lg bg-blue-50 p-4 text-left text-sm text-blue-900">
            <strong>Próximo paso:</strong> Una vez aprobado, accederás a tu panel para subir
            catálogo, inventario y ofertas.
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => navigate({ to: "/negocio" })}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Ver estado de mi negocio
            </button>
            <button
              onClick={() => setSubmitted(false)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Registrar otro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          🏪 Para negocios
        </span>
        <h1 className="mt-3 font-serif text-3xl font-bold text-slate-900 sm:text-4xl">
          Lleva tu negocio a miles de clientes
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Registra tu supermercado o tienda. Nosotros nos encargamos del delivery mientras tú
          vendes.
        </p>
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

      {/* Form Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Formulario de registro</h2>
          <p className="text-xs text-slate-600">Completa todos los campos para solicitar tu acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio *">
              <input
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className={inputCls}
                placeholder="Mi Supermercado"
              />
            </Field>
            <Field label="Tipo de negocio *">
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                className={inputCls}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico *">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputCls}
                placeholder="negocio@correo.com"
              />
            </Field>
            <Field label="Teléfono *">
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={inputCls}
                placeholder="+1 (718) 555 0123"
                inputMode="tel"
              />
            </Field>
          </div>

          <Field label="Dirección del negocio *">
            <input
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={inputCls}
              placeholder="Calle, número, colonia"
            />
          </Field>

          <Field label="Ciudad *">
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">Selecciona una zona</option>
              {NYC_DELIVERY_ZONES.map((z) => (
                <option key={z} value={z} translate="no">
                  {z}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            ⏱️ <strong>Aprobación en 48 horas.</strong> Revisaremos tu solicitud y te notificaremos
            por correo. Una vez aprobado, podrás subir tu catálogo, inventario y ofertas.
          </div>

          <button
            type="submit"
            disabled={loading || !hasAccount || existing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              <>
                Enviar solicitud
                <span aria-hidden>→</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            * Campos obligatorios. Tu información está protegida y segura.
          </p>
        </form>
      </div>

      {/* Benefits */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Benefit icon="⏱️" text="Aprobación en 48h" />
        <Benefit icon="💰" text="Sin cuota inicial" />
        <Benefit icon="🚚" text="Delivery incluido" />
        <Benefit icon="📊" text="Panel de ventas" />
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl">{icon}</div>
      <p className="mt-1 text-xs font-semibold text-slate-700">{text}</p>
    </div>
  );
}
