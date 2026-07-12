import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { submitAmoeEntry } from "@/lib/roulette.functions";

export const Route = createFileRoute("/amoe")({
  head: () => ({
    meta: [
      { title: "Entrada Gratuita (AMOE) — HAZOREX" },
      {
        name: "description",
        content:
          "Método Alternativo de Entrada Gratuita al sorteo diario de HAZOREX. Envía un ensayo original de 300+ palabras para participar sin compra.",
      },
      { name: "robots", content: "noindex,follow" },
      { property: "og:title", content: "Entrada Gratuita (AMOE) — HAZOREX" },
      {
        property: "og:description",
        content:
          "Participa gratis en el sorteo diario enviando un ensayo original de 300 palabras.",
      },
    ],
  }),
  component: AmoePage,
});

const MIN_WORDS = 300;
const MAX_WORDS = 1500;
const PROMPT_ES = `¿Por qué te gusta HAZOREX y cómo impacta el comercio local en tu comunidad?`;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function detectSuspicious(essay: string): string | null {
  const trimmed = essay.trim();
  if (!trimmed) return null;
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 10) return null;

  const windows = new Map<string, number>();
  for (let i = 0; i + 5 <= words.length; i++) {
    const key = words.slice(i, i + 5).join(" ");
    windows.set(key, (windows.get(key) ?? 0) + 1);
  }
  for (const n of windows.values()) {
    if (n >= 3) return "Detectamos frases repetidas. Reescribe el ensayo con contenido único.";
  }

  const uniq = new Set(words).size;
  const ratio = uniq / words.length;
  if (words.length >= 60 && ratio < 0.35) {
    return "El ensayo parece tener poca variación de vocabulario. Revísalo antes de enviarlo.";
  }

  return null;
}

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  essay: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  acceptRules: boolean;
  attestOriginal: boolean;
  attestNoAI: boolean;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  essay: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  dob: "",
  acceptRules: false,
  attestOriginal: false,
  attestNoAI: false,
};

function AmoePage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitAmoeEntry);
  const [form, setForm] = useState<FormState>(initialForm);
  const [pasteBlocked, setPasteBlocked] = useState(false);

  const wc = useMemo(() => countWords(form.essay), [form.essay]);
  const suspicious = useMemo(() => detectSuspicious(form.essay), [form.essay]);

  const counterClass =
    wc >= MIN_WORDS ? "counter-ok" : wc >= MIN_WORDS - 30 ? "counter-warn" : "counter-bad";

  const canSubmit =
    wc >= MIN_WORDS &&
    wc <= MAX_WORDS &&
    form.acceptRules &&
    form.attestOriginal &&
    form.attestNoAI &&
    !suspicious;

  const m = useMutation({
    mutationFn: () =>
      submit({
        data: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          essay: form.essay,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          state: form.state.toUpperCase(),
          zip: form.zip,
          dob: form.dob,
          acceptRules: true as const,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("¡Ensayo recibido! Tu entrada gratuita quedó registrada para el sorteo de hoy.");
        setForm(initialForm);
        navigate({ to: "/ruleta" });
      } else {
        toast.error(res.error);
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "No pudimos enviar tu entrada.");
    },
  });

  return (
    <main className="amoe-modal">
      <Link to="/ruleta" className="amoe-back-link">
        ← Volver a la Ruleta
      </Link>

      <div className="amoe-header">
        <h2>Entrada Gratuita — AMOE</h2>
      </div>

      <p className="law-notice">
        NO ES NECESARIO COMPRAR PARA PARTICIPAR O GANAR
      </p>

      <div className="instruction-text">
        Método Alternativo de Entrada Gratuita al sorteo diario de HAZOREX. Esta entrada tiene{" "}
        <strong>exactamente las mismas probabilidades</strong> de ganar que las entradas pagadas.
        Máx. 1 entrada AMOE por persona, correo, IP y hogar cada 24 h.{" "}
        <Link to="/sweepstakes-rules">Ver reglas oficiales</Link>.
      </div>

      <form
        className="amoe-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) {
            if (wc < MIN_WORDS) return toast.error(`El ensayo debe tener al menos ${MIN_WORDS} palabras.`);
            if (wc > MAX_WORDS) return toast.error(`El ensayo excede el máximo de ${MAX_WORDS} palabras.`);
            if (suspicious) return toast.error(suspicious);
            return toast.error("Debes aceptar todas las declaraciones para continuar.");
          }
          m.mutate();
        }}
      >
        <h3 className="amoe-section-title">1. Tus datos</h3>

        <div className="input-group">
          <label htmlFor="fullName">Nombre completo</label>
          <input
            id="fullName"
            required
            value={form.fullName}
            maxLength={120}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            required
            type="email"
            value={form.email}
            maxLength={255}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="phone">Teléfono</label>
          <input
            id="phone"
            required
            type="tel"
            value={form.phone}
            maxLength={40}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </div>

        <div className="input-group">
          <label htmlFor="dob">Fecha de nacimiento (18+)</label>
          <input
            id="dob"
            required
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            autoComplete="bday"
          />
        </div>

        <div className="input-group">
          <label htmlFor="address1">Dirección postal</label>
          <input
            id="address1"
            required
            value={form.address1}
            maxLength={200}
            onChange={(e) => setForm({ ...form, address1: e.target.value })}
            autoComplete="address-line1"
          />
        </div>

        <div className="input-group">
          <label htmlFor="address2">Apto / Suite (opcional)</label>
          <input
            id="address2"
            value={form.address2}
            maxLength={200}
            onChange={(e) => setForm({ ...form, address2: e.target.value })}
            autoComplete="address-line2"
          />
        </div>

        <div className="input-group-grid">
          <div className="input-group">
            <label htmlFor="city">Ciudad</label>
            <input
              id="city"
              required
              value={form.city}
              maxLength={100}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              autoComplete="address-level2"
            />
          </div>
          <div className="input-group">
            <label htmlFor="state">Estado</label>
            <input
              id="state"
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              autoComplete="address-level1"
            />
          </div>
          <div className="input-group">
            <label htmlFor="zip">ZIP</label>
            <input
              id="zip"
              required
              value={form.zip}
              maxLength={20}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
              autoComplete="postal-code"
            />
          </div>
        </div>

        <h3 className="amoe-section-title">2. Ensayo original</h3>

        <div className="textarea-help">
          <strong>Pregunta:</strong> {PROMPT_ES}
          <br />
          <br />
          El ensayo debe ser <strong>original, escrito por ti</strong> (mín. 300 palabras).
          Prohibido usar IA (ChatGPT, Claude, Gemini, etc.) o copiar de internet. Auditamos
          con software antiplagio; los envíos marcados quedan descalificados.
        </div>

        <div className="input-group">
          <label htmlFor="essay">Tu ensayo</label>
          <textarea
            id="essay"
            required
            placeholder="Escribe aquí tu ensayo original (mín. 300 palabras)…"
            value={form.essay}
            onChange={(e) => setForm({ ...form, essay: e.target.value })}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted && pasted.split(/\s+/).filter(Boolean).length >= 30) {
                setPasteBlocked(true);
                toast.warning(
                  "Detectamos que pegaste texto largo. El ensayo debe estar escrito por ti — puede ser descalificado.",
                );
              }
            }}
            rows={12}
            maxLength={20000}
            style={{ minHeight: 240, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        <div className={`counter-container ${counterClass}`}>
          <span>
            {wc < MIN_WORDS
              ? `Faltan ${MIN_WORDS - wc} palabras`
              : wc > MAX_WORDS
              ? `Excedes por ${wc - MAX_WORDS} palabras`
              : "Cumple el mínimo ✓"}
          </span>
          <span>
            {wc} / {MIN_WORDS} palabras
          </span>
        </div>

        {suspicious && <div className="amoe-alert">{suspicious}</div>}
        {pasteBlocked && (
          <div className="amoe-alert">
            ⚠ Se detectó texto pegado. Recomendamos reescribir con tus propias palabras.
          </div>
        )}

        <h3 className="amoe-section-title">3. Declaraciones obligatorias</h3>

        <div className="checkbox-group">
          <input
            id="attestOriginal"
            type="checkbox"
            checked={form.attestOriginal}
            onChange={(e) => setForm({ ...form, attestOriginal: e.target.checked })}
          />
          <label htmlFor="attestOriginal">
            Declaro bajo pena de perjurio que este ensayo fue{" "}
            <strong>redactado personalmente por mí</strong>, es original, inédito, y no fue
            copiado de ninguna fuente.
          </label>
        </div>

        <div className="checkbox-group">
          <input
            id="attestNoAI"
            type="checkbox"
            checked={form.attestNoAI}
            onChange={(e) => setForm({ ...form, attestNoAI: e.target.checked })}
          />
          <label htmlFor="attestNoAI">
            Declaro que <strong>no utilicé herramientas de inteligencia artificial</strong>{" "}
            (ChatGPT, Claude, Gemini, Copilot, u otras) ni asistentes de reescritura para
            generar este texto.
          </label>
        </div>

        <div className="checkbox-group">
          <input
            id="acceptRules"
            type="checkbox"
            checked={form.acceptRules}
            onChange={(e) => setForm({ ...form, acceptRules: e.target.checked })}
          />
          <label htmlFor="acceptRules">
            He leído y acepto las{" "}
            <Link to="/sweepstakes-rules" target="_blank">
              Reglas Oficiales del Sorteo
            </Link>{" "}
            y entiendo que envíos plagiados, generados por IA o duplicados serán
            descalificados automáticamente.
          </label>
        </div>

        <button type="submit" disabled={m.isPending || !canSubmit} className="btn-submit-amoe">
          {m.isPending ? "ENVIANDO…" : "ENVIAR ENTRADA GRATUITA"}
        </button>

        <p className="amoe-footnote">
          Alternativa por correo postal: también puedes enviar tu ensayo manuscrito por correo — ver
          la dirección y requisitos en las{" "}
          <Link to="/sweepstakes-rules">Reglas Oficiales</Link>.
        </p>
      </form>
    </main>
  );
}
