import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — HAZOREX ORIGEN" },
      { name: "description", content: "Términos y Condiciones / Terms of Service de HAZOREX ORIGEN Sweepstakes." },
    ],
  }),
  component: TermsPage,
});

const BLUE = "#1e3a5f";

function TermsPage() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: BLUE }}>
      <Link to="/ruleta" style={{ color: BLUE }}>← Volver a la Ruleta</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>Términos y Condiciones · Terms of Service</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        Última actualización / Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>Versión en Español</h2>
        <h3>1. Aceptación</h3>
        <p>Al usar HAZOREX ORIGEN aceptas estos Términos y nuestras <Link to="/sweepstakes-rules" style={{ color: BLUE }}>Reglas Oficiales del Sorteo</Link>.</p>
        <h3>2. Elegibilidad</h3>
        <p>Debes tener al menos 18 años. La compra de Estrellas está disponible en todo EE.UU. La participación en el sorteo está sujeta a las exclusiones estatales descritas en las Reglas Oficiales.</p>
        <h3>3. Estrellas y Compras</h3>
        <p>Las "Estrellas" son créditos virtuales sin valor monetario fuera de la plataforma y no son reembolsables salvo que la ley lo exija. Una porción de cada compra se transfiere al Prize Pool global; el resto corresponde a la operación de la plataforma. El detalle financiero específico se publica en las Reglas Oficiales del Sorteo.</p>
        <h3>4. Participación Gratuita (AMOE)</h3>
        <p>No es necesaria una compra para participar. Consulta el método AMOE en las <Link to="/sweepstakes-rules" style={{ color: BLUE }}>Reglas Oficiales</Link>.</p>
        <h3>5. Premios</h3>
        <p>Premios en USD entregados por PayPal, Zelle o cheque al ganador verificado. Sujetos a verificación KYC y W-9 conforme a ley federal de EE.UU. Sin equivalente en efectivo extra. No transferibles.</p>
        <h3>6. Limitación de Responsabilidad</h3>
        <p>El servicio se ofrece "tal cual". No garantizamos disponibilidad continua ni resultados específicos.</p>
        <h3>7. Contacto</h3>
        <p>soporte@hazorex.com</p>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>English Version</h2>
        <h3>1. Acceptance</h3>
        <p>By using HAZOREX ORIGEN you accept these Terms and our <Link to="/sweepstakes-rules" style={{ color: BLUE }}>Official Sweepstakes Rules</Link>.</p>
        <h3>2. Eligibility</h3>
        <p>You must be at least 18. Stars purchases are available throughout the U.S. Sweepstakes entry is subject to the state exclusions in the Official Rules.</p>
        <h3>3. Stars and Purchases</h3>
        <p>"Stars" are virtual credits with no monetary value outside the platform and are non-refundable except where required by law. A portion of each purchase is allocated to the global Prize Pool; the remainder funds platform operations. Specific financial breakdown is disclosed in the Official Sweepstakes Rules.</p>
        <h3>4. Free Entry (AMOE)</h3>
        <p>No purchase is necessary to enter. See AMOE method in the <Link to="/sweepstakes-rules" style={{ color: BLUE }}>Official Rules</Link>.</p>
        <h3>5. Prizes</h3>
        <p>USD prizes paid via PayPal, Zelle or check to the verified winner. Subject to KYC verification and IRS W-9 per U.S. federal law. No additional cash equivalent. Non-transferable.</p>
        <h3>6. Limitation of Liability</h3>
        <p>Service is provided "as is". No guarantee of uninterrupted availability or specific results.</p>
        <h3>7. Contact</h3>
        <p>soporte@hazorex.com</p>
      </section>
    </main>
  );
}
