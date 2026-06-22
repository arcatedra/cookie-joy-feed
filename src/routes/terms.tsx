import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — HAZOREX ORIGEN" },
      { name: "description", content: "Términos y Condiciones de uso de HAZOREX ORIGEN Sweepstakes." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#1e3a5f" }}>
      <Link to="/ruleta" style={{ color: "#1e3a5f" }}>← Volver a la Ruleta</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>Términos y Condiciones</h1>
      <p style={{ color: "#666", fontSize: 13 }}>Última actualización: Junio 2026</p>
      <h2>1. Aceptación</h2>
      <p>Al participar en HAZOREX ORIGEN aceptas estos Términos y nuestras Reglas Oficiales del Sorteo.</p>
      <h2>2. Elegibilidad</h2>
      <p>Debes tener al menos 18 años y residir en una jurisdicción donde estos sweepstakes son legales. Nulo donde la ley lo prohíba.</p>
      <h2>3. Estrellas y Compras</h2>
      <p>Las "Estrellas" son créditos virtuales sin valor monetario fuera de la plataforma. El 50% de cada compra se transfiere al Prize Pool global; el 50% restante corresponde a la operación de la plataforma.</p>
      <h2>4. Participación Gratuita</h2>
      <p>No es necesaria una compra para participar. Consulta la opción de <strong>Participación Gratuita (AMOE)</strong> en la página de la Ruleta.</p>
      <h2>5. Premios</h2>
      <p>Los premios se entregan en forma de códigos canjeables. Sin valor en efectivo. No transferibles.</p>
      <h2>6. Limitación de Responsabilidad</h2>
      <p>HAZOREX ORIGEN se ofrece "tal cual". No garantizamos disponibilidad continua.</p>
      <h2>7. Contacto</h2>
      <p>Para dudas, escribe a soporte@hazorex.com.</p>
    </main>
  );
}
