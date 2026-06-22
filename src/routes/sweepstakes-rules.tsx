import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSweepstakesPublicConfig } from "@/lib/sweepstakes-config.functions";

export const Route = createFileRoute("/sweepstakes-rules")({
  head: () => ({
    meta: [
      { title: "Reglas Oficiales del Sorteo — HAZOREX ORIGEN" },
      { name: "description", content: "Reglas Oficiales del Sweepstakes diario de HAZOREX ORIGEN — sin compra necesaria, residentes de EE.UU. 18+." },
    ],
  }),
  component: RulesPage,
});

const BLUE = "#1e3a5f";
const BEIGE = "#f4f1ea";

function RulesPage() {
  const fetchCfg = useServerFn(getSweepstakesPublicConfig);
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["sweepstakes-public-config"],
    queryFn: () => fetchCfg(),
  });

  const sponsorName = cfg?.sponsor_name ?? "HAZOREX ORIGEN LLC";
  const sponsorAddress = cfg?.address_valid ? cfg!.sponsor_address : "[DIRECCIÓN POSTAL A FINALIZAR — el sorteo aún no está activo]";
  const sponsorEmail = cfg?.sponsor_email ?? "soporte@hazorex.com";
  const excluded = (cfg?.excluded_states ?? ["FL", "NY", "RI"]).join(", ");
  const maxPrize = (cfg?.max_daily_prize_usd ?? 4999).toLocaleString("en-US");
  const claimDays = cfg?.claim_window_days ?? 14;
  const ready = cfg?.address_valid ?? false;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: BLUE }}>
      <Link to="/ruleta" style={{ color: BLUE }}>← Volver a la Ruleta</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>Reglas Oficiales del Sorteo · Official Sweepstakes Rules</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        Última actualización / Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      {!ready && (
        <div style={{ background: "#fff4d6", border: "1px solid #c9a36b", padding: 16, borderRadius: 12, marginTop: 12 }}>
          <strong>⚠ Aviso / Notice:</strong> El sorteo diario en USD <strong>aún no está activo</strong>. Estas reglas se publicarán en su versión final el día del lanzamiento.
          The daily USD sweepstakes is <strong>not yet active</strong>. These rules will be finalized on launch day.
        </div>
      )}

      <p style={{ background: BEIGE, padding: 16, borderRadius: 12, fontWeight: 700, marginTop: 20 }}>
        NO ES NECESARIA UNA COMPRA PARA PARTICIPAR O GANAR. UNA COMPRA NO INCREMENTA LAS PROBABILIDADES DE GANAR. VOID WHERE PROHIBITED.<br />
        NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE WILL NOT INCREASE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED.
      </p>

      {isLoading && <p style={{ marginTop: 24 }}>Cargando reglas…</p>}

      {/* ========== ESPAÑOL ========== */}
      <section style={{ marginTop: 32 }}>
        <h2 style={section}>Versión en Español</h2>

        <h3>1. Patrocinador (Sponsor)</h3>
        <p>{sponsorName}, {sponsorAddress}. Contacto: {sponsorEmail}.</p>

        <h3>2. Elegibilidad</h3>
        <p>
          Abierto exclusivamente a personas físicas residentes legales de los 50 estados de EE.UU. y el Distrito de
          Columbia que tengan {cfg?.min_age ?? 18} años o más al momento de participar.{" "}
          <strong>VOID en {excluded}</strong> y donde la ley lo prohíba. No son elegibles empleados, contratistas,
          directores ni familiares directos (cónyuge, padres, hijos, hermanos) ni personas que vivan en el mismo hogar
          del Patrocinador, sus afiliadas, agencias o socios.
        </p>

        <h3>3. Período del Sorteo</h3>
        <p>
          El sorteo se ejecuta diariamente. Cada "Sorteo Diario" comienza a las 12:00 AM hora del Este (ET) y cierra
          entradas a las 7:55 PM ET (5 minutos antes del sorteo). El ganador se selecciona a las 8:00 PM ET del mismo día.
        </p>

        <h3>4. Cómo Participar</h3>
        <p>Dos métodos con <strong>igual peso</strong> en el sorteo (1 boleto = 1 oportunidad ponderada):</p>
        <p><strong>4.1 Método de Compra:</strong> Compra un paquete de "Estrellas" y conviértelas en boletos a razón de 10 Estrellas = 1 boleto.</p>
        <p>
          <strong>4.2 Participación Gratuita (AMOE):</strong> Completa el formulario gratuito en{" "}
          <Link to="/ruleta" style={{ color: BLUE, fontWeight: 700 }}>hazorex.com/ruleta</Link>{" "}
          con nombre legal completo, dirección postal en EE.UU., correo, teléfono, fecha de nacimiento (18+) y un
          ensayo original de al menos 300 palabras. Cada envío válido equivale a 1 boleto con el mismo peso que un
          boleto comprado.
        </p>
        <p>
          <strong>Alternativa postal:</strong> envía una postal escrita a mano (no fotocopia) con tus datos completos
          más la frase "ENTRADA GRATUITA SORTEO HAZOREX [FECHA]" a: {sponsorName}, AMOE Entry, {sponsorAddress}. Límite:
          1 entrada AMOE por persona y día. Máximo 3 entradas por dirección IP por día.
        </p>

        <h3>5. Premios y Valor Aproximado (ARV)</h3>
        <p>
          El premio diario es el monto del Prize Pool acumulado del día en USD, financiado por una porción de cada
          compra de Estrellas más el rollover de pozos no reclamados. <strong>Valor mínimo garantizado: $25 USD. Valor
          máximo del premio diario: ${maxPrize} USD.</strong> El excedente sobre el máximo se acumula
          automáticamente al pozo del siguiente sorteo. Sin equivalente en efectivo más allá del monto del pozo. No
          transferible.
        </p>

        <h3>6. Probabilidades de Ganar</h3>
        <p>Las probabilidades dependen del número total de boletos elegibles recibidos para el sorteo de cada día.</p>

        <h3>7. Selección del Ganador y Sistema Aleatorio</h3>
        <p>
          El ganador se selecciona a las 8:00 PM ET mediante un algoritmo determinístico ponderado por boletos, usando
          una semilla criptográfica (SHA-256) que combina la fecha del sorteo, el total de boletos y un UUID aleatorio
          del servidor. El hash de la semilla (seed_hash) se publica con cada resultado para verificación pública.
        </p>

        <h3>8. Notificación y Reclamo del Premio</h3>
        <p>
          El ganador será notificado por correo electrónico en un plazo máximo de 24 horas. Tiene{" "}
          <strong>{claimDays} días naturales</strong> para reclamar en{" "}
          <span style={{ fontFamily: "monospace" }}>hazorex.com/claim/[fecha]</span> con: documento de identidad oficial
          con foto, Formulario W-9 firmado del IRS (obligatorio si &gt; $600 USD), dirección postal y método de pago
          (PayPal, Zelle o cheque). Si no reclama en plazo, el premio pasa al pozo del siguiente sorteo (rollover).
        </p>

        <h3>9. Responsabilidad Fiscal</h3>
        <p>
          El ganador es el único responsable de impuestos federales, estatales y locales. Para premios anuales
          agregados que igualen o superen $600 USD, el Patrocinador emitirá el Formulario 1099-MISC al IRS y al ganador.
        </p>

        <h3>10. Liberación de Responsabilidad</h3>
        <p>
          Al participar, los participantes liberan al Patrocinador, sus afiliados, directores, empleados y agentes de
          toda reclamación derivada de la participación, aceptación, uso o mal uso del premio.
        </p>

        <h3>11. Privacidad</h3>
        <p>
          Los datos personales se usan exclusivamente para administrar el sorteo, verificar elegibilidad, contactar al
          ganador y cumplir obligaciones fiscales. Consulta{" "}
          <Link to="/terms" style={{ color: BLUE }}>Términos y Condiciones</Link>.
        </p>

        <h3>12. Disputas y Ley Aplicable</h3>
        <p>
          Sujeto a las leyes del Estado de Delaware. Las partes acuerdan resolver disputas mediante arbitraje
          vinculante individual en Wilmington, Delaware. <strong>No se permiten demandas colectivas.</strong>
        </p>

        <h3>13. Lista de Ganadores</h3>
        <p>
          Disponible en <Link to="/ruleta" style={{ color: BLUE }}>hazorex.com/ruleta</Link> o por correo postal al
          Patrocinador durante los 90 días posteriores a cada sorteo.
        </p>

        <h3>14. Modificaciones</h3>
        <p>
          El Patrocinador puede modificar, suspender o cancelar el sorteo por causa justificada (fraude, fallo técnico,
          fuerza mayor). Cualquier cambio material se publicará aquí.
        </p>
      </section>

      {/* ========== ENGLISH ========== */}
      <section style={{ marginTop: 48 }}>
        <h2 style={section}>English Version</h2>

        <h3>1. Sponsor</h3>
        <p>{sponsorName}, {sponsorAddress}. Contact: {sponsorEmail}.</p>

        <h3>2. Eligibility</h3>
        <p>
          Open only to legal residents of the 50 United States and the District of Columbia who are {cfg?.min_age ?? 18}{" "}
          years of age or older at time of entry. <strong>VOID in {excluded}</strong> and where prohibited by law.
          Employees, contractors, directors, immediate family members (spouse, parents, children, siblings) and
          household members of the Sponsor, its affiliates, agencies and partners are not eligible.
        </p>

        <h3>3. Sweepstakes Period</h3>
        <p>
          Daily sweepstakes. Each "Daily Draw" begins at 12:00 AM Eastern Time (ET) and closes entries at 7:55 PM ET
          (5 minutes prior to the drawing). Winner is selected at 8:00 PM ET that same day.
        </p>

        <h3>4. How to Enter</h3>
        <p>Two methods, with <strong>equal weight</strong> (1 ticket = 1 weighted chance):</p>
        <p><strong>4.1 Purchase Method:</strong> Buy a "Stars" package and convert them to tickets at 10 Stars = 1 ticket.</p>
        <p>
          <strong>4.2 Alternate Method Of Entry (AMOE):</strong> Complete the free form at{" "}
          <Link to="/ruleta" style={{ color: BLUE, fontWeight: 700 }}>hazorex.com/ruleta</Link>{" "}
          with your full legal name, U.S. mailing address, email, phone, date of birth (18+) and an original essay of
          at least 300 words. Each valid submission counts as 1 ticket with the same weight as a purchased ticket.
        </p>
        <p>
          <strong>Mail-in alternative:</strong> hand-write a postcard (no photocopy) with your complete details plus
          the phrase "FREE ENTRY HAZOREX SWEEPSTAKES [DATE]" and mail to: {sponsorName}, AMOE Entry, {sponsorAddress}.
          Limit: 1 AMOE entry per person per day. Maximum 3 entries per IP address per day.
        </p>

        <h3>5. Prizes and Approximate Retail Value (ARV)</h3>
        <p>
          The daily prize is the accumulated Prize Pool for the day in USD, funded by a portion of each Stars purchase
          plus rollover from unclaimed pools. <strong>Minimum guaranteed value: $25 USD. Maximum daily prize value:
          ${maxPrize} USD.</strong> Any amount above the cap automatically rolls into the next day's pool. No cash
          equivalent beyond the pool amount. Non-transferable.
        </p>

        <h3>6. Odds of Winning</h3>
        <p>Odds depend on the number of eligible entries received for each daily drawing.</p>

        <h3>7. Winner Selection</h3>
        <p>
          The winner is selected at 8:00 PM ET via a deterministic ticket-weighted algorithm using a cryptographic
          seed (SHA-256) combining the draw date, total tickets and a random server UUID. The seed hash is published
          with each result for public verification.
        </p>

        <h3>8. Winner Notification and Prize Claim</h3>
        <p>
          The winner will be notified by email within 24 hours and has <strong>{claimDays} calendar days</strong> to
          claim the prize at <span style={{ fontFamily: "monospace" }}>hazorex.com/claim/[date]</span> by providing:
          government-issued photo ID, signed IRS Form W-9 (required for prizes &gt; $600 USD), mailing address and
          payment method (PayPal, Zelle or check). Unclaimed prizes roll over to the next drawing.
        </p>

        <h3>9. Tax Responsibility</h3>
        <p>
          Winner is solely responsible for all federal, state, and local taxes. For aggregated prizes of $600 USD or
          more in a calendar year, Sponsor will issue IRS Form 1099-MISC.
        </p>

        <h3>10. Release of Liability</h3>
        <p>
          By entering, participants release Sponsor, its affiliates, directors, employees and agents from any claims
          arising out of participation, acceptance, use or misuse of the prize.
        </p>

        <h3>11. Privacy</h3>
        <p>
          Personal data is used solely to administer the sweepstakes, verify eligibility, contact the winner and meet
          tax obligations. See our <Link to="/terms" style={{ color: BLUE }}>Terms of Service</Link>.
        </p>

        <h3>12. Disputes and Governing Law</h3>
        <p>
          These Rules are governed by the laws of the State of Delaware. Parties agree to resolve disputes through
          individual binding arbitration in Wilmington, Delaware. <strong>No class actions permitted.</strong>
        </p>

        <h3>13. Winners List</h3>
        <p>
          Available at <Link to="/ruleta" style={{ color: BLUE }}>hazorex.com/ruleta</Link> or by written mail to the
          Sponsor for 90 days after each drawing.
        </p>

        <h3>14. Modifications</h3>
        <p>
          Sponsor may modify, suspend or cancel the sweepstakes for cause (fraud, technical failure, force majeure).
          Material changes will be posted here.
        </p>
      </section>

      <p style={{ marginTop: 40, fontSize: 12, color: "#888" }}>
        © {new Date().getFullYear()} {sponsorName} · Todos los derechos reservados / All rights reserved.
      </p>
    </main>
  );
}

const section = { fontSize: 22, fontWeight: 900, borderBottom: `2px solid ${BLUE}`, paddingBottom: 6, marginBottom: 12 } as const;
