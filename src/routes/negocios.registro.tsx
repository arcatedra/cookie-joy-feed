import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  registerBusiness,
  fetchMyBusiness,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from "@/lib/businesses";
import { NYC_DELIVERY_ZONES } from "@/lib/nyc-zones";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

export const Route = createFileRoute("/negocios/registro")({
  head: () => ({
    meta: [
      { title: i18n.t("negociosRegistro.metaTitle") },
      { name: "description", content: i18n.t("negociosRegistro.metaDesc") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessRegistrationPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <NotFoundBlock />,
});

function NotFoundBlock() {
  const { t } = useTranslation();
  return <div className="p-6 text-sm">{t("negociosRegistro.notFound")}</div>;
}

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
  const { t } = useTranslation();
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
    if (!formData.business_name.trim()) return setError(t("negociosRegistro.errors.nameRequired")), false;
    if (!formData.email.trim()) return setError(t("negociosRegistro.errors.emailRequired")), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError(t("negociosRegistro.errors.emailInvalid")), false;
    if (!formData.phone.trim()) return setError(t("negociosRegistro.errors.phoneRequired")), false;
    if (formData.phone.replace(/\D/g, "").length < 10) return setError(t("negociosRegistro.errors.phoneFormat")), false;
    if (!formData.address.trim()) return setError(t("negociosRegistro.errors.addressRequired")), false;
    if (!formData.city.trim()) return setError(t("negociosRegistro.errors.cityRequired")), false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!hasAccount) {
      setError(t("negociosRegistro.errors.mustSignIn"));
      return;
    }
    if (existing) {
      setError(t("negociosRegistro.errors.alreadyRegistered"));
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
      setError(err?.message ?? t("negociosRegistro.errors.generic"));
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
      <div className="min-h-screen bg-[#f4f1ea]">
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-2xl border border-[#c8862e]/30 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-9 w-9" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">
              {t("negociosRegistro.success.title")}
            </h1>
            <p className="mt-2 text-sm text-[#4a3525]">
              {t("negociosRegistro.success.body")}
            </p>
            <div className="mt-5 rounded-lg border border-[#c8862e]/30 bg-[#f4f1ea] p-4 text-left text-sm text-[#1e3a5f]">
              <strong>{t("negociosRegistro.success.nextStrong")}</strong>{" "}
              {t("negociosRegistro.success.nextBody")}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => navigate({ to: "/negocio" })}
                className="min-h-11 w-full rounded-lg bg-[#E6C35C] px-4 py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#d4b04a]"
              >
                {t("negociosRegistro.success.viewStatus")}
              </button>
              <button
                onClick={() => setSubmitted(false)}
                className="min-h-11 w-full rounded-lg border border-[#1e3a5f]/30 bg-white px-4 py-3 text-sm font-semibold text-[#1e3a5f] transition hover:bg-[#f4f1ea]"
              >
                {t("negociosRegistro.success.registerAnother")}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#4a3525] hover:text-[#1e3a5f]"
        >
          <ArrowLeft className="h-4 w-4" /> {t("negociosRegistro.back")}
        </Link>

        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E6C35C] px-3 py-1 text-xs font-semibold text-[#1e3a5f]">
            🏪 {t("negociosRegistro.badge")}
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1e3a5f] sm:text-4xl">
            {t("negociosRegistro.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#4a3525]">
            {t("negociosRegistro.subtitle")}
          </p>
        </div>

        {!hasAccount && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
            {t("negociosRegistro.signInPrompt")}{" "}
            <Link to="/auth" className="font-semibold text-amber-900 underline">
              {t("negociosRegistro.signInLink")}
            </Link>
          </div>
        )}

        {existing && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
            {t("negociosRegistro.existing")}{" "}
            <Link to="/negocio" className="font-semibold text-amber-900 underline">
              {t("negociosRegistro.existingLink")}
            </Link>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-[#c8862e]/30 bg-white shadow-sm">
          <div className="border-b border-[#c8862e]/20 bg-[#f4f1ea] px-6 py-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">
              {t("negociosRegistro.form.title")}
            </h2>
            <p className="text-xs text-[#4a3525]">
              {t("negociosRegistro.form.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("negociosRegistro.form.name")}>
                <input
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder={t("negociosRegistro.form.namePlaceholder")}
                />
              </Field>
              <Field label={t("negociosRegistro.form.type")}>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  className={inputCls}
                >
                  {TYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`negociosRegistro.types.${tp}`, BUSINESS_TYPE_LABELS[tp])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("negociosRegistro.form.email")}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder={t("negociosRegistro.form.emailPlaceholder")}
                />
              </Field>
              <Field label={t("negociosRegistro.form.phone")}>
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

            <Field label={t("negociosRegistro.form.address")}>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={inputCls}
                placeholder={t("negociosRegistro.form.addressPlaceholder")}
              />
            </Field>

            <Field label={t("negociosRegistro.form.city")}>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">{t("negociosRegistro.form.selectZone")}</option>
                {NYC_DELIVERY_ZONES.map((z) => {
                  const isOther = z === "Otra zona";
                  return (
                    <option key={z} value={z} translate={isOther ? undefined : "no"}>
                      {isOther ? t("negociosRegistro.form.otherZone") : z}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              ⏱️ <strong>{t("negociosRegistro.notice.strong")}</strong>{" "}
              {t("negociosRegistro.notice.body")}
            </div>

            <button
              type="submit"
              disabled={loading || !hasAccount || existing}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E6C35C] px-4 py-3 text-sm font-semibold text-[#1e3a5f] shadow-sm transition hover:bg-[#d4b04a] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  {t("negociosRegistro.submitting")}
                </>
              ) : (
                <>
                  {t("negociosRegistro.submit")}
                  <span aria-hidden>→</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#4a3525]">
              {t("negociosRegistro.form.required")}
            </p>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Benefit icon="⏱️" text={t("negociosRegistro.benefits.b1")} />
          <Benefit icon="💰" text={t("negociosRegistro.benefits.b2")} />
          <Benefit icon="🚚" text={t("negociosRegistro.benefits.b3")} />
          <Benefit icon="📊" text={t("negociosRegistro.benefits.b4")} />
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#c8862e]/40 bg-white px-4 py-3 text-sm text-[#1e3a5f] placeholder:text-[#4a3525]/50 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#1e3a5f]">{label}</span>
      {children}
    </label>
  );
}

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-xl border border-[#c8862e]/30 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl">{icon}</div>
      <p className="mt-1 text-xs font-semibold text-[#1e3a5f]">{text}</p>
    </div>
  );
}
