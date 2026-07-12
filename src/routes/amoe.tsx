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

const BLUE = "#1e3a5f";
const BLUE_SOFT = "#4a6b8a";
const BEIGE = "#f4f1ea";
const BEIGE_DEEP = "#d9d2c1";
const GOLD = "#c9a36b";
const DANGER = "#a63232";
const OK = "#1f7a3a";

const MIN_WORDS = 300;
const MAX_WORDS = 1500;
const PROMPT_ES = `¿Por qué te gusta HAZOREX y cómo impacta el comercio local en tu comunidad?`;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Very lightweight heuristic red flags. Server does the real audit.
function detectSuspicious(essay: string): string | null {
  const trimmed = essay.trim();
  if (!trimmed) return null;
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 10) return null;

  // Repetition: same 5-word window repeated 3+ times.
  const windows = new Map<string, number>();
  for (let i = 0; i + 5 <= words.length; i++) {
    const key = words.slice(i, i + 5).join(" ");
    windows.set(key, (windows.get(key) ?? 0) + 1);
  }
  for (const n of windows.values()) {
    if (n >= 3) return "Detectamos frases repetidas. Reescribe el ensayo con contenido único.";
  }

  // Lexical diversity (unique / total). AI/plagio suele ser alto pero bajo en variación aquí filtramos textos triviales.
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

  const wcColor = wc >= MIN_WORDS ? OK : wc >= MIN_WORDS - 30 ? "#a97a1e" : DANGER;

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

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${BEIGE_DEEP}`,
    background: "white",
    color: BLUE,
    fontSize: 15,
    fontFamily: "inherit",
  } as const;

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "2.5rem 1.25rem 4rem",
        fontFamily: "system-ui, sans-serif",
        color: BLUE,
        lineHeight: 1.6,
      }}
    >
      <Link to="/ruleta" style={{ color: BLUE, fontSize: 13 }}>
        ← Volver a la Ruleta
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 900, marginTop: 12, marginBottom: 4 }}>
        Entrada Gratuita — AMOE
      </h1>
      <p style={{ color: BLUE_SOFT, marginTop: 0 }}>
        Método Alternativo de Entrada Gratuita al sorteo diario de HAZOREX.
      </p>

      <div
        style={{
          background: BEIGE,
          border: `1px solid ${BEIGE_DEEP}`,
          padding: 16,
          borderRadius: 12,
          marginTop: 16,
          fontSize: 14,
        }}
      >
        <strong>NO ES NECESARIO COMPRAR PARA PARTICIPAR O GANAR.</strong> Esta entrada gratuita
        tiene <strong>exactamente las mismas probabilidades</strong> de ganar que las entradas
        pagadas. Máx. 1 entrada AMOE por persona, correo, IP y hogar cada 24 h.{" "}
        <Link to="/sweepstakes-rules" style={{ color: BLUE, fontWeight: 700 }}>
          Ver reglas oficiales
        </Link>
        .
      </div>

      <div
        style={{
          background: "#fff7e0",
          border: `1px solid ${GOLD}`,
          padding: 16,
          borderRadius: 12,
          marginTop: 12,
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        <strong>Antes de escribir, lee esto:</strong>
        <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
          <li>El ensayo debe ser <strong>original, redactado por ti</strong>, mínimo 300 palabras.</li>
          <li>
            <strong>Prohibido</strong> usar IA (ChatGPT, Claude, Gemini, etc.), copiar/pegar de
            internet, o reenviar el mismo texto.
          </li>
          <li>
            Auditamos con software antiplagio y detección de IA. Los envíos marcados quedan{" "}
            <strong>descalificados automáticamente</strong>.
          </li>
          <li>Solo se acepta 1 entrada AMOE por día por persona.</li>
        </ul>
      </div>

      <form
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
        style={{ display: "grid", gap: 12, marginTop: 24 }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 0 }}>1. Tus datos</h2>

        <input
          required
          placeholder="Nombre completo"
          value={form.fullName}
          maxLength={120}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          style={inputStyle}
          autoComplete="name"
        />
        <input
          required
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          maxLength={255}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
          autoComplete="email"
        />
        <input
          required
          type="tel"
          placeholder="Teléfono"
          value={form.phone}
          maxLength={40}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={inputStyle}
          autoComplete="tel"
        />
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: BLUE_SOFT }}>Fecha de nacimiento (18+)</label>
          <input
            required
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            style={inputStyle}
            autoComplete="bday"
          />
        </div>
        <input
          required
          placeholder="Dirección postal"
          value={form.address1}
          maxLength={200}
          onChange={(e) => setForm({ ...form, address1: e.target.value })}
          style={inputStyle}
          autoComplete="address-line1"
        />
        <input
          placeholder="Apto / Suite (opcional)"
          value={form.address2}
          maxLength={200}
          onChange={(e) => setForm({ ...form, address2: e.target.value })}
          style={inputStyle}
          autoComplete="address-line2"
        />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
          <input
            required
            placeholder="Ciudad"
            value={form.city}
            maxLength={100}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            style={inputStyle}
            autoComplete="address-level2"
          />
          <input
            required
            placeholder="Estado"
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            style={inputStyle}
            autoComplete="address-level1"
          />
          <input
            required
            placeholder="ZIP"
            value={form.zip}
            maxLength={20}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
            style={inputStyle}
            autoComplete="postal-code"
          />
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12, marginBottom: 0 }}>
          2. Ensayo original
        </h2>
        <div
          style={{
            background: "white",
            border: `1px dashed ${BEIGE_DEEP}`,
            padding: 12,
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <strong>Pregunta:</strong> {PROMPT_ES}
        </div>

        <textarea
          required
          placeholder="Escribe aquí tu ensayo original (mín. 300 palabras)…"
          value={form.essay}
          onChange={(e) => setForm({ ...form, essay: e.target.value })}
          onPaste={(e) => {
            // Discourage paste. Allow but flag.
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
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 240,
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: wcColor,
            fontWeight: 700,
          }}
        >
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

        {suspicious && (
          <div
            style={{
              background: "#fdecec",
              border: `1px solid ${DANGER}`,
              color: DANGER,
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {suspicious}
          </div>
        )}
        {pasteBlocked && (
          <div style={{ fontSize: 12, color: DANGER }}>
            ⚠ Se detectó texto pegado. Recomendamos reescribir con tus propias palabras.
          </div>
        )}

        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 12, marginBottom: 0 }}>
          3. Declaraciones obligatorias
        </h2>

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: BLUE }}>
          <input
            type="checkbox"
            checked={form.attestOriginal}
            onChange={(e) => setForm({ ...form, attestOriginal: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>
            Declaro bajo pena de perjurio que este ensayo fue <strong>redactado personalmente por mí</strong>,
            es original, inédito, y no fue copiado de ninguna fuente.
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: BLUE }}>
          <input
            type="checkbox"
            checked={form.attestNoAI}
            onChange={(e) => setForm({ ...form, attestNoAI: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>
            Declaro que <strong>no utilicé herramientas de inteligencia artificial</strong> (ChatGPT,
            Claude, Gemini, Copilot, u otras) ni asistentes de reescritura para generar este texto.
          </span>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: BLUE }}>
          <input
            type="checkbox"
            checked={form.acceptRules}
            onChange={(e) => setForm({ ...form, acceptRules: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>
            He leído y acepto las{" "}
            <Link to="/sweepstakes-rules" target="_blank" style={{ color: BLUE, fontWeight: 700 }}>
              Reglas Oficiales del Sorteo
            </Link>{" "}
            y entiendo que envíos plagiados, generados por IA o duplicados serán descalificados
            automáticamente sin previo aviso.
          </span>
        </label>

        <button
          type="submit"
          disabled={m.isPending || !canSubmit}
          style={{
            marginTop: 12,
            padding: "16px",
            background: canSubmit ? BLUE : BEIGE_DEEP,
            color: canSubmit ? BEIGE : BLUE_SOFT,
            border: "none",
            borderRadius: 10,
            fontWeight: 900,
            fontSize: 15,
            cursor: canSubmit ? "pointer" : "not-allowed",
            letterSpacing: "0.08em",
          }}
        >
          {m.isPending ? "ENVIANDO…" : "ENVIAR ENTRADA GRATUITA"}
        </button>

        <p style={{ fontSize: 11, color: BLUE_SOFT, margin: 0, lineHeight: 1.6 }}>
          Alternativa por correo postal: también puedes enviar tu ensayo manuscrito por correo — ver
          la dirección y requisitos en las{" "}
          <Link to="/sweepstakes-rules" style={{ color: BLUE }}>
            Reglas Oficiales
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
