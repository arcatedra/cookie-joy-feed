import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Bike,
  Car,
  DollarSign,
  Clock,
  ShieldCheck,
  FileCheck2,
  ChevronDown,
  Loader2,
  Zap,
  CheckCircle2,
  Upload,
  User as UserIcon,
  FileText,
  ArrowLeft,
  ArrowRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/SiteFooter";
import { sendTransactionalEmail } from "@/lib/email/send";
import i18n from "@/i18n";

export const Route = createFileRoute("/repartidores")({
  head: () => ({
    meta: [
      { title: i18n.t("repartidoresPage.metaTitle") },
      { name: "description", content: i18n.t("repartidoresPage.metaDesc") },
      { property: "og:title", content: i18n.t("repartidoresPage.metaTitle") },
      { property: "og:description", content: i18n.t("repartidoresPage.metaOg") },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hazorex.com/repartidores" },
    ],
    links: [{ rel: "canonical", href: "https://hazorex.com/repartidores" }],
  }),
  component: RepartidoresLanding,
});

type DriverRow = {
  application_status: "pendiente" | "en_revision" | "aprobado" | "rechazado" | "suspendido";
  rejection_reason: string | null;
};

import { NYC_DELIVERY_ZONES } from "@/lib/nyc-zones";
const ZONES = NYC_DELIVERY_ZONES;

function RepartidoresLanding() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();

  const { data: driver, isLoading: driverLoading, refetch: refetchDriver } = useQuery({
    queryKey: ["driver-application", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<DriverRow | null> => {
      const { data, error } = await supabase
        .from("drivers")
        .select("application_status, rejection_reason")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as DriverRow | null;
    },
  });

  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#c8862e]/30 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0f2338] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#E6C35C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-[#E6C35C]/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
          <Badge className="mb-4 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#E6C35C]">
            <Zap className="mr-1 size-3.5" /> {t("repartidoresPage.hero.badge")}
          </Badge>

          <h1 className="font-serif text-4xl font-black leading-[1.05] md:text-6xl">
            {t("repartidoresPage.hero.titlePart1")}{" "}
            <span className="text-[#E6C35C]">{t("repartidoresPage.hero.titleHighlight")}</span>
            <br className="hidden md:block" />
            {t("repartidoresPage.hero.titlePart2")}
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/85 md:text-xl">
            {t("repartidoresPage.hero.subtitlePart1")}{" "}
            <span className="font-semibold text-[#E6C35C]">
              {t("repartidoresPage.hero.subtitleHighlight")}
            </span>
            {t("repartidoresPage.hero.subtitlePart2")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ApplyCta
              authLoading={authLoading}
              isLoggedIn={!!user}
              driver={driver ?? null}
              driverLoading={driverLoading}
              onStart={() => {
                setShowForm(true);
                setTimeout(
                  () =>
                    document
                      .getElementById("postulacion")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  50,
                );
              }}
            />
            <a
              href="#requisitos"
              className="text-sm text-white/70 underline-offset-4 hover:text-[#E6C35C] hover:underline"
            >
              {t("repartidoresPage.hero.viewRequirements")}
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Clock className="size-4 shrink-0 text-[#E6C35C]" /> {t("repartidoresPage.hero.perks.flexible")}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <DollarSign className="size-4 shrink-0 text-[#E6C35C]" /> {t("repartidoresPage.hero.perks.weekly")}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck className="size-4 shrink-0 text-[#E6C35C]" /> {t("repartidoresPage.hero.perks.noFee")}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <CheckCircle2 className="size-4 shrink-0 text-[#E6C35C]" /> {t("repartidoresPage.hero.perks.reply48")}
            </div>
          </div>
        </div>
      </section>

      {/* Application section (form or status) */}
      <section id="postulacion" className="mx-auto max-w-3xl px-4 py-14 md:px-6">
        {authLoading || (user && driverLoading) ? (
          <Card className="border-[#c8862e]/30 bg-white">
            <CardContent className="grid place-items-center p-10">
              <Loader2 className="size-6 animate-spin text-[#1e3a5f]" />
            </CardContent>
          </Card>
        ) : !user ? (
          <Card className="border-[#c8862e]/30 bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="font-serif text-2xl font-bold">{t("repartidoresPage.signInGate.title")}</h2>
              <p className="mt-2 text-[#4a3525]">{t("repartidoresPage.signInGate.body")}</p>
              <Button
                asChild
                size="lg"
                className="mt-6 min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
              >
                <Link to="/auth" search={{ redirect: "/repartidores" }}>
                  {t("repartidoresPage.signInGate.cta")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : driver ? (
          <ApplicationStatusCard driver={driver} />
        ) : showForm ? (
          <ApplicationForm
            userEmail={user.email ?? ""}
            userId={user.id}
            onSuccess={() => refetchDriver()}
          />
        ) : (
          <Card className="border-[#c8862e]/30 bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="font-serif text-2xl font-bold">
                {t("repartidoresPage.readyGate.title")}
              </h2>
              <p className="mt-2 text-[#4a3525]">{t("repartidoresPage.readyGate.body")}</p>
              <Button
                size="lg"
                className="mt-6 min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
                onClick={() => setShowForm(true)}
              >
                {t("repartidoresPage.readyGate.cta")}
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* VEHÍCULOS */}
      <section id="requisitos" className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-[#1e3a5f]/20 bg-white text-[#1e3a5f]"
          >
            {t("repartidoresPage.vehicles.badge")}
          </Badge>
          <h2 className="mb-3 font-serif text-3xl font-bold md:text-4xl">
            {t("repartidoresPage.vehicles.title")}
          </h2>
          <p className="mb-2 text-[#4a3525]">
            {t("repartidoresPage.vehicles.bodyPart1")}{" "}
            <strong>{t("repartidoresPage.vehicles.bodyStrong")}</strong>
            {t("repartidoresPage.vehicles.bodyPart2")}
          </p>
          <p className="mb-10 text-sm text-[#4a3525]/70">
            {t("repartidoresPage.vehicles.hint")}
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              icon: Bike,
              label: t("repartidoresPage.vehicles.moto.label"),
              desc: t("repartidoresPage.vehicles.moto.desc"),
              perks: [
                t("repartidoresPage.vehicles.moto.perk1"),
                t("repartidoresPage.vehicles.moto.perk2"),
                t("repartidoresPage.vehicles.moto.perk3"),
              ],
            },
            {
              icon: Car,
              label: t("repartidoresPage.vehicles.auto.label"),
              desc: t("repartidoresPage.vehicles.auto.desc"),
              perks: [
                t("repartidoresPage.vehicles.auto.perk1"),
                t("repartidoresPage.vehicles.auto.perk2"),
                t("repartidoresPage.vehicles.auto.perk3"),
              ],
            },
          ].map(({ icon: Icon, label, desc, perks }) => (
            <Card
              key={label}
              className="group relative overflow-hidden border-[#c8862e]/30 bg-white transition hover:border-[#E6C35C] hover:shadow-lg"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-14 place-items-center rounded-full bg-[#1e3a5f] text-[#E6C35C] transition group-hover:scale-105">
                    <Icon className="size-7" />
                  </div>
                  <div>
                    <p className="font-serif text-xl font-bold text-[#1e3a5f]">{label}</p>
                    <p className="text-sm text-[#4a3525]">{desc}</p>
                  </div>
                </div>
                <ul className="grid gap-1.5 border-t border-[#c8862e]/20 pt-3 text-sm text-[#4a3525]">
                  {perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#1e3a5f]" /> {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-[#c8862e]/20 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold">
            {t("repartidoresPage.how.title")}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              { n: 1, title: t("repartidoresPage.how.s1.title"), body: t("repartidoresPage.how.s1.body"), icon: FileCheck2 },
              { n: 2, title: t("repartidoresPage.how.s2.title"), body: t("repartidoresPage.how.s2.body"), icon: ShieldCheck },
              { n: 3, title: t("repartidoresPage.how.s3.title"), body: t("repartidoresPage.how.s3.body"), icon: DollarSign },
            ].map(({ n, title, body, icon: Icon }) => (
              <li
                key={n}
                className="relative rounded-2xl border border-[#c8862e]/20 bg-[#f4f1ea] p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#1e3a5f] font-bold text-[#E6C35C]">
                    {n}
                  </span>
                  <Icon className="size-5 text-[#1e3a5f]" />
                </div>
                <h3 className="mb-1 font-serif text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-[#4a3525]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* REQUIREMENTS */}
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-center font-serif text-3xl font-bold">
          {t("repartidoresPage.requirements.title")}
        </h2>
        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="p-6 md:p-8">
            <ul className="grid gap-4 md:grid-cols-2">
              {[
                t("repartidoresPage.requirements.r1"),
                t("repartidoresPage.requirements.r2"),
                t("repartidoresPage.requirements.r3"),
                t("repartidoresPage.requirements.r4"),
                t("repartidoresPage.requirements.r5"),
                t("repartidoresPage.requirements.r6"),
              ].map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-[#1e3a5f] text-[10px] font-bold text-[#E6C35C]">
                    ✓
                  </span>
                  <span className="text-sm text-[#4a3525]">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#c8862e]/20 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-6">
          <h2 className="mb-8 text-center font-serif text-3xl font-bold">
            {t("repartidoresPage.faq.title")}
          </h2>
          <div className="space-y-3">
            {(["q1","q2","q3","q4","q5"] as const).map((k) => (
              <FaqItem
                key={k}
                q={t(`repartidoresPage.faq.${k}.q`)}
                a={t(`repartidoresPage.faq.${k}.a`)}
              />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ============================================================
// FAQ item
// ============================================================
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#c8862e]/30 bg-[#f4f1ea]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-11 items-center justify-between gap-3 p-4 text-left font-serif font-semibold text-[#1e3a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8862e] rounded-xl"
      >
        <span>{q}</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm leading-relaxed text-[#4a3525]">{a}</p>
      )}
    </div>
  );
}

// ============================================================
// Apply CTA
// ============================================================
function ApplyCta({
  authLoading,
  isLoggedIn,
  driver,
  driverLoading,
  onStart,
}: {
  authLoading: boolean;
  isLoggedIn: boolean;
  driver: DriverRow | null;
  driverLoading: boolean;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  if (authLoading || (isLoggedIn && driverLoading)) {
    return (
      <Button size="lg" disabled className="min-h-11 bg-[#E6C35C] text-[#1e3a5f]">
        <Loader2 className="mr-2 size-4 animate-spin" /> {t("repartidoresPage.cta.loading")}
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        asChild
        size="lg"
        className="min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
      >
        <Link to="/auth" search={{ redirect: "/repartidores" }}>
          {t("repartidoresPage.signInGate.cta")}
        </Link>
      </Button>
    );
  }

  if (!driver) {
    return (
      <Button
        size="lg"
        onClick={onStart}
        className="min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
      >
        {t("repartidoresPage.readyGate.cta")}
      </Button>
    );
  }

  return (
    <a
      href="#postulacion"
      className="inline-flex min-h-11 items-center rounded-md bg-[#E6C35C] px-6 py-2 font-semibold text-[#1e3a5f] hover:bg-[#d4b04a]"
    >
      {t("repartidoresPage.cta.viewStatus")}
    </a>
  );
}

// ============================================================
// Application status card
// ============================================================
function ApplicationStatusCard({ driver }: { driver: DriverRow }) {
  const { t } = useTranslation();
  const status = driver.application_status;

  if (status === "aprobado") {
    return (
      <Card className="border-emerald-500/40 bg-white">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" />
          <h2 className="font-serif text-2xl font-bold text-[#1e3a5f]">
            {t("repartidoresPage.status.approved.title")}
          </h2>
          <p className="mt-2 text-[#4a3525]">{t("repartidoresPage.status.approved.body")}</p>
          <Button
            asChild
            size="lg"
            className="mt-6 min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
          >
            <Link to="/repartidor">{t("repartidoresPage.status.approved.cta")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const map: Record<string, { title: string; body: string; tone: string; icon: React.ReactNode }> = {
    pendiente: {
      title: t("repartidoresPage.status.pending.title"),
      body: t("repartidoresPage.status.pending.body"),
      tone: "border-amber-500/40",
      icon: <Clock className="mx-auto mb-3 size-10 text-amber-600" />,
    },
    en_revision: {
      title: t("repartidoresPage.status.inReview.title"),
      body: t("repartidoresPage.status.inReview.body"),
      tone: "border-amber-500/40",
      icon: <Clock className="mx-auto mb-3 size-10 text-amber-600" />,
    },
    rechazado: {
      title: t("repartidoresPage.status.rejected.title"),
      body: driver.rejection_reason ?? t("repartidoresPage.status.rejected.body"),
      tone: "border-red-500/40",
      icon: <FileText className="mx-auto mb-3 size-10 text-red-600" />,
    },
    suspendido: {
      title: t("repartidoresPage.status.suspended.title"),
      body: t("repartidoresPage.status.suspended.body"),
      tone: "border-red-500/40",
      icon: <FileText className="mx-auto mb-3 size-10 text-red-600" />,
    },
  };
  const cur = map[status] ?? map.pendiente;

  return (
    <Card className={`bg-white ${cur.tone}`}>
      <CardContent className="p-8 text-center">
        {cur.icon}
        <h2 className="font-serif text-2xl font-bold text-[#1e3a5f]">{cur.title}</h2>
        <p className="mt-2 text-[#4a3525]">{cur.body}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Multi-step application form
// ============================================================
const MAX_FILE_MB = 5;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

const step1Schema = z.object({
  fullName: z.string().trim().min(3, "err_fullName").max(120),
  email: z.string().trim().email("err_email").max(255),
  phone: z
    .string()
    .trim()
    .min(10, "err_phone_short")
    .max(20)
    .refine((v) => {
      const digits = v.replace(/[^\d]/g, "");
      if (digits.length === 10) return true;
      if (digits.length === 11 && digits.startsWith("1")) return true;
      return false;
    }, "err_phone_format"),
  dateOfBirth: z
    .string()
    .min(1, "err_dob_required")
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const today = new Date();
      const eighteen = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate(),
      );
      return d <= eighteen;
    }, "err_dob_underage"),
  city: z.string().trim().min(1, "err_zone"),
  address: z.string().trim().min(3, "err_address").max(200),
});

const step2Schema = z.object({
  vehicleType: z.enum(["moto", "auto"], {
    error: () => "err_vehicle",
  }),
  licenseNumber: z.string().trim().min(3, "err_license").max(50),
  insurer: z.string().trim().min(2, "err_insurer").max(80),
  plateNumber: z.string().trim().max(20).optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

type DocKey =
  | "identificacion"
  | "licencia_conducir"
  | "seguro_vehiculo"
  | "foto_perfil"
  | "casco";

function ApplicationForm({
  userEmail,
  userId,
  onSuccess,
}: {
  userEmail: string;
  userId: string;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const [s1, setS1] = useState<Step1>({
    fullName: "",
    email: userEmail,
    phone: "",
    dateOfBirth: "",
    city: "",
    address: "",
  });
  const [s2, setS2] = useState<Step2>({
    vehicleType: "moto",
    licenseNumber: "",
    insurer: "",
    plateNumber: "",
  });
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [accept, setAccept] = useState(false);

  const docLabel = (k: DocKey) => t(`repartidoresPage.docs.${k}.label`);
  const docHint = (k: DocKey) => t(`repartidoresPage.docs.${k}.hint`);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIME.includes(f.type)) {
      return t("repartidoresPage.form.fileTypeError");
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      return t("repartidoresPage.form.fileSizeError", { size: MAX_FILE_MB });
    }
    return null;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const uploaded: Partial<Record<DocKey, string>> = {};
      for (const [key, file] of Object.entries(files) as [DocKey, File][]) {
        if (!file) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userId}/${key}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("driver-documents")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw new Error(t("repartidoresPage.form.uploadError", { doc: docLabel(key), msg: upErr.message }));
        const { data: signed, error: signErr } = await supabase.storage
          .from("driver-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signErr) throw new Error(signErr.message);
        uploaded[key] = signed.signedUrl;
      }

      const profilePhotoUrl = uploaded.foto_perfil ?? null;
      const { error: drvErr } = await supabase.from("drivers").insert({
        id: userId,
        full_name: s1.fullName,
        email: s1.email,
        phone: s1.phone,
        date_of_birth: s1.dateOfBirth,
        address: s1.address,
        city: s1.city,
        profile_photo_url: profilePhotoUrl,
      });
      if (drvErr) throw new Error(t("repartidoresPage.form.driverError", { msg: drvErr.message }));

      const { error: vehErr } = await supabase.from("driver_vehicles").insert({
        driver_id: userId,
        vehicle_type: s2.vehicleType,
        plate_number: s2.plateNumber || null,
      });
      if (vehErr) throw new Error(t("repartidoresPage.form.vehicleError", { msg: vehErr.message }));

      const docRows = (Object.entries(uploaded) as [DocKey, string][]).map(
        ([document_type, file_url]) => ({ driver_id: userId, document_type, file_url }),
      );
      if (docRows.length > 0) {
        const { error: docErr } = await supabase.from("driver_documents").insert(docRows as any);
        if (docErr) throw new Error(t("repartidoresPage.form.docsError", { msg: docErr.message }));
      }

      const refId = `HZX-DRV-${userId.slice(0, 8).toUpperCase()}`;

      try {
        await sendTransactionalEmail({
          templateName: "driver-application-received",
          recipientEmail: s1.email,
          idempotencyKey: `driver-app-${userId}`,
          templateData: {
            driverName: s1.fullName.split(" ")[0],
            referenceId: refId,
          },
        });
      } catch (e) {
        console.warn("Confirmation email failed:", e);
      }

      return refId;
    },
    onSuccess: (refId) => {
      setSubmittedRef(refId);
      setStep(4);
      onSuccess();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const requiredDocs: DocKey[] = useMemo(() => {
    const base: DocKey[] = ["identificacion", "licencia_conducir", "seguro_vehiculo", "foto_perfil"];
    if (s2.vehicleType === "moto") base.push("casco");
    return base;
  }, [s2.vehicleType]);

  // Translate zod error codes to localized messages
  const errMsg = (code: string) => t(`repartidoresPage.form.errors.${code}`, code);

  if (submittedRef) {
    return (
      <Card className="border-emerald-500/40 bg-white">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-600" />
          <h2 className="font-serif text-2xl font-bold text-[#1e3a5f]">
            {t("repartidoresPage.success.title")}
          </h2>
          <p className="mt-2 text-[#4a3525]">
            {t("repartidoresPage.success.bodyPart1")}
            <strong>{t("repartidoresPage.success.bodyStrong")}</strong>
            {t("repartidoresPage.success.bodyPart2")}
          </p>
          <div className="mx-auto mt-6 max-w-xs rounded-xl border border-[#c8862e]/40 bg-[#f4f1ea] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#8a7a6a]">
              {t("repartidoresPage.success.refLabel")}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-serif text-xl tracking-widest text-[#1e3a5f]">
                {submittedRef}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(submittedRef);
                  toast.success(t("repartidoresPage.success.copied"));
                }}
                aria-label={t("repartidoresPage.success.copyAria")}
                className="grid size-8 place-items-center rounded-md hover:bg-white"
              >
                <Copy className="size-4 text-[#1e3a5f]" />
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#4a3525]/70">
            {t("repartidoresPage.success.tip")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const goStep1Next = () => {
    const res = step1Schema.safeParse(s1);
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const issue of res.error.issues) errs[issue.path[0] as string] = errMsg(issue.message);
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  };
  const goStep2Next = () => {
    const res = step2Schema.safeParse(s2);
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const issue of res.error.issues) errs[issue.path[0] as string] = errMsg(issue.message);
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(3);
  };
  const goStep3Next = () => {
    const errs: Record<string, string> = {};
    for (const key of requiredDocs) {
      if (!files[key]) errs[key] = t("repartidoresPage.form.required");
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(t("repartidoresPage.form.uploadAll"));
      return;
    }
    setErrors({});
    setStep(4);
  };

  return (
    <Card className="border-[#c8862e]/30 bg-white">
      <CardContent className="p-6 md:p-8">
        <StepIndicator step={step} />

        {/* STEP 1 */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<UserIcon className="size-5" />}
              title={t("repartidoresPage.form.step1.title")}
            />
            <Field
              label={t("repartidoresPage.form.fullName")}
              htmlFor="fullName"
              error={errors.fullName}
              required
            >
              <Input
                id="fullName"
                autoComplete="name"
                value={s1.fullName}
                onChange={(e) => setS1({ ...s1, fullName: e.target.value })}
                className="min-h-11"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("repartidoresPage.form.email")}
                htmlFor="email"
                error={errors.email}
                required
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={s1.email}
                  onChange={(e) => setS1({ ...s1, email: e.target.value })}
                  className="min-h-11"
                />
              </Field>
              <Field
                label={t("repartidoresPage.form.phone")}
                htmlFor="phone"
                error={errors.phone}
                required
              >
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 (718) 555 0000"
                  value={s1.phone}
                  onChange={(e) => setS1({ ...s1, phone: e.target.value })}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("repartidoresPage.form.dob")}
                htmlFor="dateOfBirth"
                error={errors.dateOfBirth}
                required
              >
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={s1.dateOfBirth}
                  onChange={(e) => setS1({ ...s1, dateOfBirth: e.target.value })}
                  className="min-h-11"
                />
              </Field>
              <Field
                label={t("repartidoresPage.form.zone")}
                htmlFor="city"
                error={errors.city}
                required
              >
                <select
                  id="city"
                  value={s1.city}
                  onChange={(e) => setS1({ ...s1, city: e.target.value })}
                  className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("repartidoresPage.form.selectEllipsis")}</option>
                  {ZONES.map((zone) => (
                    <option key={zone} value={zone} translate="no">
                      {zone}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={t("repartidoresPage.form.address")}
              htmlFor="address"
              error={errors.address}
              required
            >
              <Input
                id="address"
                autoComplete="street-address"
                value={s1.address}
                onChange={(e) => setS1({ ...s1, address: e.target.value })}
                className="min-h-11"
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                className="min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
                onClick={goStep1Next}
              >
                {t("repartidoresPage.form.continue")} <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<Bike className="size-5" />}
              title={t("repartidoresPage.form.step2.title")}
              subtitle={t("repartidoresPage.form.step2.subtitle")}
            />
            <div className="grid grid-cols-2 gap-3">
              {(["moto", "auto"] as const).map((v) => {
                const active = s2.vehicleType === v;
                const Icon = v === "moto" ? Bike : Car;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setS2({ ...s2, vehicleType: v })}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 p-4 text-sm font-semibold transition ${
                      active
                        ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                        : "border-[#c8862e]/30 bg-white text-[#1e3a5f] hover:border-[#E6C35C]"
                    }`}
                  >
                    <Icon className="size-5" />
                    {v === "moto"
                      ? t("repartidoresPage.vehicles.moto.label")
                      : t("repartidoresPage.vehicles.auto.label")}
                  </button>
                );
              })}
            </div>
            {errors.vehicleType && (
              <p className="text-xs text-red-600">{errors.vehicleType}</p>
            )}

            <Field
              label={t("repartidoresPage.form.licenseNumber")}
              htmlFor="licenseNumber"
              error={errors.licenseNumber}
              required
            >
              <Input
                id="licenseNumber"
                value={s2.licenseNumber}
                onChange={(e) => setS2({ ...s2, licenseNumber: e.target.value })}
                className="min-h-11"
              />
            </Field>
            <Field
              label={t("repartidoresPage.form.insurer")}
              htmlFor="insurer"
              error={errors.insurer}
              required
            >
              <Input
                id="insurer"
                value={s2.insurer}
                onChange={(e) => setS2({ ...s2, insurer: e.target.value })}
                className="min-h-11"
              />
            </Field>
            <Field
              label={t("repartidoresPage.form.plate")}
              htmlFor="plateNumber"
              error={errors.plateNumber}
            >
              <Input
                id="plateNumber"
                value={s2.plateNumber}
                onChange={(e) => setS2({ ...s2, plateNumber: e.target.value })}
                className="min-h-11"
              />
            </Field>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-2 size-4" /> {t("repartidoresPage.form.back")}
              </Button>
              <Button
                size="lg"
                className="min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
                onClick={goStep2Next}
              >
                {t("repartidoresPage.form.continue")} <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<FileText className="size-5" />}
              title={t("repartidoresPage.form.step3.title")}
              subtitle={t("repartidoresPage.form.step3.subtitle")}
            />

            <div className="rounded-lg border border-[#1e3a5f]/20 bg-[#f4f1ea] p-4 text-xs leading-relaxed text-[#4a3525]">
              <strong>{t("repartidoresPage.form.privacy.strong")}</strong>{" "}
              {t("repartidoresPage.form.privacy.body")}{" "}
              <Link
                to="/privacidad"
                className="font-semibold text-[#1e3a5f] underline underline-offset-2"
              >
                {t("repartidoresPage.form.privacy.link")}
              </Link>
              .
            </div>

            {requiredDocs.map((key) => (
              <FileUpload
                key={key}
                docKey={key}
                file={files[key]}
                label={docLabel(key)}
                hint={docHint(key)}
                onChange={(f) => {
                  if (f) {
                    const err = validateFile(f);
                    if (err) {
                      toast.error(err);
                      return;
                    }
                  }
                  setFiles((prev) => ({ ...prev, [key]: f ?? undefined }));
                  setErrors((prev) => ({ ...prev, [key]: "" }));
                }}
                error={errors[key]}
              />
            ))}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={() => setStep(2)}
              >
                <ArrowLeft className="mr-2 size-4" /> {t("repartidoresPage.form.back")}
              </Button>
              <Button
                size="lg"
                className="min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
                onClick={goStep3Next}
              >
                {t("repartidoresPage.form.continue")} <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<CheckCircle2 className="size-5" />}
              title={t("repartidoresPage.form.step4.title")}
            />

            <p className="text-xs text-[#4a3525]/70">
              {t("repartidoresPage.form.step4.hint")}
            </p>

            <SummarySection
              title={t("repartidoresPage.form.step1.title")}
              onEdit={() => setStep(1)}
              rows={[
                { label: t("repartidoresPage.summary.name"), value: s1.fullName },
                { label: t("repartidoresPage.summary.email"), value: s1.email },
                { label: t("repartidoresPage.summary.phone"), value: s1.phone },
                { label: t("repartidoresPage.summary.dob"), value: s1.dateOfBirth },
                { label: t("repartidoresPage.summary.zone"), value: s1.city },
                { label: t("repartidoresPage.summary.address"), value: s1.address },
              ]}
            />

            <SummarySection
              title={t("repartidoresPage.form.step2.title")}
              onEdit={() => setStep(2)}
              rows={[
                {
                  label: t("repartidoresPage.summary.type"),
                  value: s2.vehicleType === "moto"
                    ? t("repartidoresPage.vehicles.moto.label")
                    : t("repartidoresPage.vehicles.auto.label"),
                },
                { label: t("repartidoresPage.summary.license"), value: s2.licenseNumber },
                { label: t("repartidoresPage.summary.insurer"), value: s2.insurer },
                { label: t("repartidoresPage.summary.plate"), value: s2.plateNumber || "—" },
              ]}
            />

            <div className="rounded-lg border border-[#c8862e]/30 bg-[#f4f1ea] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-serif text-sm font-bold text-[#1e3a5f]">
                  {t("repartidoresPage.form.step3.title")}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-[#1e3a5f] underline underline-offset-2 hover:text-[#c8862e]"
                >
                  {t("repartidoresPage.summary.edit")}
                </button>
              </div>
              <ul className="space-y-1.5">
                {requiredDocs.map((k) => {
                  const f = files[k];
                  return (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-3 text-xs text-[#4a3525]"
                    >
                      <span className="truncate">{docLabel(k)}</span>
                      <DocStatusBadge state={f ? "subido" : "pendiente"} />
                    </li>
                  );
                })}
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c8862e]/30 bg-white p-4 text-sm text-[#4a3525] min-h-11">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                {t("repartidoresPage.form.accept.part1")}{" "}
                <Link
                  to="/terms"
                  className="font-semibold text-[#1e3a5f] underline underline-offset-2"
                >
                  {t("repartidoresPage.form.accept.terms")}
                </Link>{" "}
                {t("repartidoresPage.form.accept.and")}{" "}
                <Link
                  to="/privacidad"
                  className="font-semibold text-[#1e3a5f] underline underline-offset-2"
                >
                  {t("repartidoresPage.form.accept.privacy")}
                </Link>{" "}
                {t("repartidoresPage.form.accept.part2")}
              </span>
            </label>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                size="lg"
                className="min-h-11"
                disabled={submitMutation.isPending}
                onClick={() => setStep(3)}
              >
                <ArrowLeft className="mr-2 size-4" /> {t("repartidoresPage.form.back")}
              </Button>
              <Button
                size="lg"
                className="min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
                disabled={!accept || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("repartidoresPage.form.submitting")}
                  </>
                ) : (
                  t("repartidoresPage.form.submit")
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Helpers
// ============================================================
function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const { t } = useTranslation();
  const labels = [
    t("repartidoresPage.steps.s1"),
    t("repartidoresPage.steps.s2"),
    t("repartidoresPage.steps.s3"),
    t("repartidoresPage.steps.s4"),
  ];
  return (
    <ol className="flex items-center justify-between gap-2" aria-label={t("repartidoresPage.steps.progressAria")}>
      {labels.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const active = n === step;
        const done = n < step;
        return (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-[#1e3a5f] text-[#E6C35C]"
                    : "bg-[#f4f1ea] text-[#4a3525]"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : n}
            </span>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                active ? "text-[#1e3a5f]" : "text-[#4a3525]/70"
              }`}
            >
              {l}
            </span>
            {i < labels.length - 1 && (
              <span className="ml-1 h-px flex-1 bg-[#c8862e]/30" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[#1e3a5f]">
        {icon}
        <h3 className="font-serif text-lg font-bold">{title}</h3>
      </div>
      {subtitle && <p className="mt-1 text-xs text-[#4a3525]/70">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-[#1e3a5f]">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function FileUpload({
  docKey,
  file,
  label,
  hint,
  onChange,
  error,
}: {
  docKey: DocKey;
  file: File | undefined;
  label: string;
  hint: string;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const inputId = `file-${docKey}`;
  const isImageOnly = docKey === "foto_perfil" || docKey === "casco";

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium text-[#1e3a5f]">
        {label} <span className="text-red-600">*</span>
      </Label>
      <div
        className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3 ${
          error ? "border-red-400 bg-red-50" : "border-[#c8862e]/40 bg-[#f4f1ea]/40"
        }`}
      >
        {file && (
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-[#c8862e]/30 bg-white">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t("repartidoresPage.form.previewAlt", { name: label })}
                className="size-full object-cover"
              />
            ) : (
              <FileText className="size-5 text-[#1e3a5f]" aria-hidden />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {file ? (
            <div className="flex items-center gap-2 text-sm text-[#1e3a5f]">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-[#4a3525]/60">
                ({(file.size / 1024 / 1024).toFixed(2)}MB)
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#4a3525]/70">{hint}</p>
          )}
        </div>
        <DocStatusBadge state={file ? "subido" : "pendiente"} />
        <Button
          type="button"
          variant={file ? "outline" : "default"}
          size="sm"
          className={`min-h-11 ${file ? "" : "bg-[#1e3a5f] text-white hover:bg-[#16294a]"}`}
          onClick={() => ref.current?.click()}
        >
          <Upload className="mr-1.5 size-3.5" />
          {file ? t("repartidoresPage.form.change") : t("repartidoresPage.form.upload")}
        </Button>
        <input
          ref={ref}
          id={inputId}
          type="file"
          accept={isImageOnly ? "image/jpeg,image/png" : ".jpg,.jpeg,.png,.pdf"}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function SummarySection({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: { label: string; value: string }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-[#c8862e]/30 bg-[#f4f1ea] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-serif text-sm font-bold text-[#1e3a5f]">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-[#1e3a5f] underline underline-offset-2 hover:text-[#c8862e]"
        >
          {t("repartidoresPage.summary.edit")}
        </button>
      </div>
      <dl className="grid grid-cols-1 gap-1 text-xs text-[#4a3525] sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-1">
            <dt className="text-[#4a3525]/70">{r.label}:</dt>
            <dd className="truncate font-medium text-[#1e3a5f]">{r.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DocStatusBadge({
  state,
}: {
  state: "pendiente" | "subido" | "verificado" | "rechazado";
}) {
  const { t } = useTranslation();
  const cls: Record<typeof state, string> = {
    pendiente: "bg-amber-100 text-amber-800 border-amber-300",
    subido: "bg-blue-100 text-blue-800 border-blue-300",
    verificado: "bg-emerald-100 text-emerald-800 border-emerald-300",
    rechazado: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls[state]}`}
    >
      {t(`repartidoresPage.docStatus.${state}`)}
    </span>
  );
}
