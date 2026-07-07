import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
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

export const Route = createFileRoute("/repartidores")({
  head: () => ({
    meta: [
      { title: "Sé repartidor · Hazorex" },
      {
        name: "description",
        content:
          "Únete al equipo de repartidores de Hazorex. Postúlate en minutos, elige tus horarios y gana dinero entregando pedidos en tu ciudad.",
      },
      { property: "og:title", content: "Sé repartidor · Hazorex" },
      {
        property: "og:description",
        content:
          "Postúlate como repartidor de Hazorex. Horarios flexibles, pagos semanales y proceso de aprobación transparente.",
      },
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

const ZONES = [
  "San Salvador",
  "Santa Tecla",
  "Antiguo Cuscatlán",
  "Nuevo Cuscatlán",
  "Soyapango",
  "Mejicanos",
  "Ilopango",
  "San Marcos",
  "Apopa",
  "Ciudad Merliot",
  "Otra zona",
];

function RepartidoresLanding() {
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
            <Zap className="mr-1 size-3.5" /> Postúlate en 5 minutos
          </Badge>

          <h1 className="font-serif text-4xl font-black leading-[1.05] md:text-6xl">
            Gana hasta <span className="text-[#E6C35C]">$25/hora</span>
            <br className="hidden md:block" />
            repartiendo con Hazorex
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/85 md:text-xl">
            Tú manejas tu tiempo, nosotros los pedidos. Solo necesitas{" "}
            <span className="font-semibold text-[#E6C35C]">moto o auto</span>, licencia
            vigente y ganas de rodar.
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
              Ver requisitos →
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Clock className="size-4 shrink-0 text-[#E6C35C]" /> Horarios flexibles
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <DollarSign className="size-4 shrink-0 text-[#E6C35C]" /> Pagos semanales
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck className="size-4 shrink-0 text-[#E6C35C]" /> Sin cuota inicial
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <CheckCircle2 className="size-4 shrink-0 text-[#E6C35C]" /> Respuesta en 48 h
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
              <h2 className="font-serif text-2xl font-bold">Empieza tu postulación</h2>
              <p className="mt-2 text-[#4a3525]">
                Primero inicia sesión o crea tu cuenta de Hazorex. Es rápido.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-6 min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
              >
                <Link to="/auth" search={{ redirect: "/repartidores" }}>
                  Iniciar sesión y postularme
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
                Todo listo para tu postulación
              </h2>
              <p className="mt-2 text-[#4a3525]">
                Tarda ~5 minutos. Ten a la mano tu identificación, licencia y seguro
                vigentes.
              </p>
              <Button
                size="lg"
                className="mt-6 min-h-11 bg-[#E6C35C] text-[#1e3a5f] hover:bg-[#d4b04a]"
                onClick={() => setShowForm(true)}
              >
                Empezar postulación
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* VEHÍCULOS — solo motorizados (canonical statement) */}
      <section id="requisitos" className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-[#1e3a5f]/20 bg-white text-[#1e3a5f]"
          >
            Vehículos aceptados
          </Badge>
          <h2 className="mb-3 font-serif text-3xl font-bold md:text-4xl">
            Solo aceptamos moto o auto
          </h2>
          <p className="mb-2 text-[#4a3525]">
            Para garantizar entregas rápidas y con cobertura completa, en Hazorex{" "}
            <strong>solo aceptamos repartidores en moto o auto</strong>. No aceptamos
            entregas a pie ni en bicicleta.
          </p>
          <p className="mb-10 text-sm text-[#4a3525]/70">
            Elige el tuyo abajo y te pediremos solo los documentos correspondientes.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              icon: Bike,
              label: "Moto",
              desc: "Ideal para tráfico denso. Entregas más rápidas.",
              perks: ["Licencia A vigente", "Seguro/SOAT vigente", "Casco"],
            },
            {
              icon: Car,
              label: "Auto",
              desc: "Perfecto para pedidos grandes y clima variable.",
              perks: ["Licencia B vigente", "Seguro vigente", "Revisión al día"],
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

      {/* CÓMO FUNCIONA */}
      <section className="border-t border-[#c8862e]/20 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-6">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold">Cómo funciona</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                title: "Postúlate",
                body: "Completa tus datos, elige tu vehículo y sube los documentos que te pedimos.",
                icon: FileCheck2,
              },
              {
                n: 2,
                title: "Te revisamos",
                body: "Nuestro equipo verifica tu información en un máximo de 48 horas. Te avisamos por email.",
                icon: ShieldCheck,
              },
              {
                n: 3,
                title: "Empieza a ganar",
                body: "Una vez aprobado, activa tu disponibilidad y recibe pedidos cerca de ti.",
                icon: DollarSign,
              },
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

      {/* REQUISITOS */}
      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        <h2 className="mb-6 text-center font-serif text-3xl font-bold">Requisitos</h2>
        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="p-6 md:p-8">
            <ul className="grid gap-4 md:grid-cols-2">
              {[
                "Ser mayor de 18 años",
                "Moto o auto propio (no aceptamos a pie ni bicicleta)",
                "Licencia de conducir vigente (tipo A para moto, tipo B para auto)",
                "Seguro/SOAT del vehículo vigente",
                "Identificación oficial vigente",
                "Foto de perfil clara (selfie)",
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
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "¿Necesito tener un vehículo propio?",
                a: "Sí. En Hazorex solo aceptamos repartidores en moto o auto para garantizar tiempos de entrega y cobertura de zona. No aceptamos entregas a pie ni en bicicleta.",
              },
              {
                q: "¿Cuánto tarda la aprobación?",
                a: "Te respondemos en un máximo de 48 horas después de que subes todos tus documentos.",
              },
              {
                q: "¿Cuándo cobro?",
                a: "Los pagos se procesan semanalmente por el total de entregas completadas.",
              },
              {
                q: "¿Puedo elegir mis horarios?",
                a: "Sí. Tú activas tu disponibilidad cuando quieres recibir pedidos.",
              },
              {
                q: "¿Qué pasa con mis documentos?",
                a: "Tus documentos se usan únicamente para verificar tu identidad y elegibilidad. Se almacenan de forma cifrada y solo el equipo de verificación tiene acceso. Puedes solicitar su eliminación en cualquier momento.",
              },
            ].map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ============================================================
// FAQ item (keyboard-accessible)
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
// Apply CTA (hero button)
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
  if (authLoading || (isLoggedIn && driverLoading)) {
    return (
      <Button size="lg" disabled className="min-h-11 bg-[#E6C35C] text-[#1e3a5f]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Cargando…
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
          Iniciar sesión y postularme
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
        Empezar postulación
      </Button>
    );
  }

  // Ya tiene una postulación
  return (
    <a
      href="#postulacion"
      className="inline-flex min-h-11 items-center rounded-md bg-[#E6C35C] px-6 py-2 font-semibold text-[#1e3a5f] hover:bg-[#d4b04a]"
    >
      Ver estado de mi postulación
    </a>
  );
}

// ============================================================
// Application status card (existing driver)
// ============================================================
function ApplicationStatusCard({ driver }: { driver: DriverRow }) {
  const status = driver.application_status;

  if (status === "aprobado") {
    return (
      <Card className="border-emerald-500/40 bg-white">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" />
          <h2 className="font-serif text-2xl font-bold text-[#1e3a5f]">
            ¡Estás aprobado como repartidor de Hazorex!
          </h2>
          <p className="mt-2 text-[#4a3525]">
            Entra a tu panel para configurar tu disponibilidad y empezar a repartir.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
          >
            <Link to="/repartidor">Ir a mi panel</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const map: Record<
    string,
    { title: string; body: string; tone: string; icon: React.ReactNode }
  > = {
    pendiente: {
      title: "Postulación recibida",
      body: "Estamos revisando tu información. Te avisaremos por correo en un máximo de 48 horas.",
      tone: "border-amber-500/40",
      icon: <Clock className="mx-auto mb-3 size-10 text-amber-600" />,
    },
    en_revision: {
      title: "Postulación en revisión",
      body: "El equipo está verificando tus documentos. Te avisaremos por correo pronto.",
      tone: "border-amber-500/40",
      icon: <Clock className="mx-auto mb-3 size-10 text-amber-600" />,
    },
    rechazado: {
      title: "Postulación rechazada",
      body:
        driver.rejection_reason ??
        "Puedes escribirnos a soporte@hazorex.com para resolver los detalles y volver a postular.",
      tone: "border-red-500/40",
      icon: <FileText className="mx-auto mb-3 size-10 text-red-600" />,
    },
    suspendido: {
      title: "Cuenta suspendida",
      body: "Escríbenos a soporte@hazorex.com para más detalles.",
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
  fullName: z.string().trim().min(3, "Ingresa tu nombre completo").max(120),
  email: z.string().trim().email("Correo inválido").max(255),
  phone: z
    .string()
    .trim()
    .min(7, "Teléfono inválido")
    .max(20)
    .regex(/^[+\d\s()-]+$/, "Solo números y símbolos de teléfono"),
  dateOfBirth: z
    .string()
    .min(1, "Selecciona tu fecha de nacimiento")
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
    }, "Debes ser mayor de 18 años"),
  city: z.string().trim().min(1, "Selecciona tu zona de reparto"),
  address: z.string().trim().min(3, "Ingresa tu dirección").max(200),
});

const step2Schema = z.object({
  vehicleType: z.enum(["moto", "auto"], {
    errorMap: () => ({ message: "Selecciona moto o auto" }),
  }),
  licenseNumber: z.string().trim().min(3, "Ingresa tu número de licencia").max(50),
  insurer: z.string().trim().min(2, "Ingresa tu aseguradora").max(80),
  plateNumber: z.string().trim().max(20).optional(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

type DocKey = "identificacion" | "licencia_conducir" | "seguro_vehiculo" | "foto_perfil";
const DOC_LABELS: Record<DocKey, { label: string; hint: string }> = {
  identificacion: {
    label: "Identificación oficial (DUI, pasaporte, cédula)",
    hint: "Imagen o PDF, máx 5MB",
  },
  licencia_conducir: {
    label: "Licencia de conducir vigente",
    hint: "Imagen o PDF, máx 5MB",
  },
  seguro_vehiculo: {
    label: "Seguro/SOAT del vehículo vigente",
    hint: "Imagen o PDF, máx 5MB",
  },
  foto_perfil: {
    label: "Selfie clara (foto de perfil)",
    hint: "Imagen jpg/png, máx 5MB",
  },
};

function ApplicationForm({
  userEmail,
  userId,
  onSuccess,
}: {
  userEmail: string;
  userId: string;
  onSuccess: () => void;
}) {
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

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_MIME.includes(f.type)) {
      return "Formato no permitido. Usa JPG, PNG o PDF.";
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      return `Archivo muy grande (máx ${MAX_FILE_MB}MB).`;
    }
    return null;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // 1) Upload files
      const uploaded: Partial<Record<DocKey, string>> = {};
      for (const [key, file] of Object.entries(files) as [DocKey, File][]) {
        if (!file) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userId}/${key}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("driver-documents")
          .upload(path, file, {
            contentType: file.type,
            upsert: true,
          });
        if (upErr) throw new Error(`No se pudo subir ${DOC_LABELS[key].label}: ${upErr.message}`);
        // Signed URL good for 1 year — admin reviewers open via <a href>
        const { data: signed, error: signErr } = await supabase.storage
          .from("driver-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signErr) throw new Error(signErr.message);
        uploaded[key] = signed.signedUrl;
      }

      // 2) Insert drivers row
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
      if (drvErr) throw new Error(`No se pudo crear tu registro: ${drvErr.message}`);

      // 3) Vehicle
      const { error: vehErr } = await supabase.from("driver_vehicles").insert({
        driver_id: userId,
        vehicle_type: s2.vehicleType,
        plate_number: s2.plateNumber || null,
      });
      if (vehErr) throw new Error(`No se pudo guardar tu vehículo: ${vehErr.message}`);

      // 4) Documents
      const docRows = (Object.entries(uploaded) as [DocKey, string][]).map(
        ([document_type, file_url]) => ({
          driver_id: userId,
          document_type,
          file_url,
        }),
      );
      if (docRows.length > 0) {
        const { error: docErr } = await supabase.from("driver_documents").insert(docRows);
        if (docErr) throw new Error(`No se pudieron guardar tus documentos: ${docErr.message}`);
      }

      // 5) Reference id
      const refId = `HZX-DRV-${userId.slice(0, 8).toUpperCase()}`;

      // 6) Confirmation email (non-blocking)
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

  const requiredDocs: DocKey[] = useMemo(
    () => ["identificacion", "licencia_conducir", "seguro_vehiculo", "foto_perfil"],
    [],
  );

  // ---------- SUCCESS SCREEN ----------
  if (submittedRef) {
    return (
      <Card className="border-emerald-500/40 bg-white">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-600" />
          <h2 className="font-serif text-2xl font-bold text-[#1e3a5f]">
            ¡Postulación recibida!
          </h2>
          <p className="mt-2 text-[#4a3525]">
            Te contactaremos por correo en un máximo de <strong>48 horas</strong>.
          </p>
          <div className="mx-auto mt-6 max-w-xs rounded-xl border border-[#c8862e]/40 bg-[#f4f1ea] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#8a7a6a]">
              Número de referencia
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-serif text-xl tracking-widest text-[#1e3a5f]">
                {submittedRef}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(submittedRef);
                  toast.success("Copiado");
                }}
                aria-label="Copiar número de referencia"
                className="grid size-8 place-items-center rounded-md hover:bg-white"
              >
                <Copy className="size-4 text-[#1e3a5f]" />
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#4a3525]/70">
            Guarda este número. Te ayudará si necesitas contactarnos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---------- STEP UI ----------
  const goStep1Next = () => {
    const res = step1Schema.safeParse(s1);
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const issue of res.error.issues) errs[issue.path[0] as string] = issue.message;
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
      for (const issue of res.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(3);
  };
  const goStep3Next = () => {
    const errs: Record<string, string> = {};
    for (const key of requiredDocs) {
      if (!files[key]) errs[key] = "Requerido";
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Sube todos los documentos requeridos");
      return;
    }
    setErrors({});
    setStep(4);
  };

  return (
    <Card className="border-[#c8862e]/30 bg-white">
      <CardContent className="p-6 md:p-8">
        <StepIndicator step={step} />

        {/* STEP 1: Personal data */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<UserIcon className="size-5" />}
              title="Datos personales"
            />
            <Field
              label="Nombre completo"
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
                label="Correo electrónico"
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
              <Field label="Teléfono" htmlFor="phone" error={errors.phone} required>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+503 7000 0000"
                  value={s1.phone}
                  onChange={(e) => setS1({ ...s1, phone: e.target.value })}
                  className="min-h-11"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Fecha de nacimiento (18+)"
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
                label="Zona de reparto"
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
                  <option value="">Selecciona…</option>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Dirección" htmlFor="address" error={errors.address} required>
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
                Continuar <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Vehicle */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<Bike className="size-5" />}
              title="Vehículo"
              subtitle="Solo aceptamos moto o auto."
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
                    {v === "moto" ? "Moto" : "Auto"}
                  </button>
                );
              })}
            </div>
            {errors.vehicleType && (
              <p className="text-xs text-red-600">{errors.vehicleType}</p>
            )}

            <Field
              label="Número de licencia de conducir"
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
              label="Aseguradora"
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
              label="Placa (opcional)"
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
                <ArrowLeft className="mr-2 size-4" /> Atrás
              </Button>
              <Button
                size="lg"
                className="min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
                onClick={goStep2Next}
              >
                Continuar <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Documents */}
        {step === 3 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<FileText className="size-5" />}
              title="Documentos"
              subtitle="Todos los archivos son opcionales de reordenar; pero todos son obligatorios."
            />

            <div className="rounded-lg border border-[#1e3a5f]/20 bg-[#f4f1ea] p-4 text-xs leading-relaxed text-[#4a3525]">
              <strong>Privacidad de tus documentos.</strong> Se usan únicamente para
              verificar tu identidad y elegibilidad. Se almacenan de forma cifrada y solo
              el equipo de verificación tiene acceso. Puedes solicitar su eliminación en
              cualquier momento escribiendo a soporte@hazorex.com. Ver también nuestra{" "}
              <Link
                to="/privacidad"
                className="font-semibold text-[#1e3a5f] underline underline-offset-2"
              >
                Política de privacidad
              </Link>
              .
            </div>

            {requiredDocs.map((key) => (
              <FileUpload
                key={key}
                docKey={key}
                file={files[key]}
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
                <ArrowLeft className="mr-2 size-4" /> Atrás
              </Button>
              <Button
                size="lg"
                className="min-h-11 bg-[#1e3a5f] text-white hover:bg-[#16294a]"
                onClick={goStep3Next}
              >
                Continuar <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation + submit */}
        {step === 4 && (
          <div className="mt-6 space-y-4">
            <SectionHeader
              icon={<CheckCircle2 className="size-5" />}
              title="Confirmación"
            />

            <div className="rounded-lg border border-[#c8862e]/30 bg-[#f4f1ea] p-4 text-sm text-[#4a3525]">
              <p>
                <strong>{s1.fullName}</strong>
              </p>
              <p>
                {s1.email} · {s1.phone}
              </p>
              <p>
                {s1.city} — {s1.address}
              </p>
              <p className="mt-2">
                Vehículo: <strong>{s2.vehicleType === "moto" ? "Moto" : "Auto"}</strong> ·
                Licencia {s2.licenseNumber} · {s2.insurer}
              </p>
              <p className="mt-2">
                Documentos subidos:{" "}
                <strong>
                  {Object.values(files).filter(Boolean).length} / {requiredDocs.length}
                </strong>
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c8862e]/30 bg-white p-4 text-sm text-[#4a3525] min-h-11">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-1 size-4 shrink-0"
              />
              <span>
                Confirmo que la información proporcionada es verídica y acepto los{" "}
                <Link
                  to="/terminos"
                  className="font-semibold text-[#1e3a5f] underline underline-offset-2"
                >
                  Términos
                </Link>{" "}
                y la{" "}
                <Link
                  to="/privacidad"
                  className="font-semibold text-[#1e3a5f] underline underline-offset-2"
                >
                  Política de Privacidad
                </Link>{" "}
                de Hazorex.
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
                <ArrowLeft className="mr-2 size-4" /> Atrás
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
                    Enviando postulación…
                  </>
                ) : (
                  "Enviar postulación"
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
// Small helpers
// ============================================================
function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Datos", "Vehículo", "Documentos", "Confirmar"];
  return (
    <ol className="flex items-center justify-between gap-2" aria-label="Progreso">
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
  onChange,
  error,
}: {
  docKey: DocKey;
  file: File | undefined;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const info = DOC_LABELS[docKey];
  const inputId = `file-${docKey}`;
  const isImageOnly = docKey === "foto_perfil";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium text-[#1e3a5f]">
        {info.label} <span className="text-red-600">*</span>
      </Label>
      <div
        className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3 ${
          error ? "border-red-400 bg-red-50" : "border-[#c8862e]/40 bg-[#f4f1ea]/40"
        }`}
      >
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
            <p className="text-xs text-[#4a3525]/70">{info.hint}</p>
          )}
        </div>
        <Button
          type="button"
          variant={file ? "outline" : "default"}
          size="sm"
          className={`min-h-11 ${file ? "" : "bg-[#1e3a5f] text-white hover:bg-[#16294a]"}`}
          onClick={() => ref.current?.click()}
        >
          <Upload className="mr-1.5 size-3.5" />
          {file ? "Cambiar" : "Subir"}
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
