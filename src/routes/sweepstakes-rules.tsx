import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sweepstakes-rules")({
  head: () => ({
    meta: [
      { title: "Reglas Oficiales del Sorteo — HAZOREX ORIGEN" },
      { name: "description", content: "Reglas oficiales del Sweepstakes HAZOREX ORIGEN." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#1e3a5f" }}>
      <Link to="/ruleta" style={{ color: "#1e3a5f" }}>← Volver a la Ruleta</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>Reglas Oficiales del Sorteo</h1>
      <p style={{ color: "#666", fontSize: 13 }}>NO ES NECESARIA UNA COMPRA PARA PARTICIPAR O GANAR. LA COMPRA NO INCREMENTA TUS PROBABILIDADES DE GANAR.</p>

      <h2>1. Patrocinador</h2>
      <p>HAZOREX ORIGEN, en adelante "el Patrocinador".</p>

      <h2>2. Elegibilidad</h2>
      <p>Abierto a residentes legales de los Estados Unidos (excluyendo donde esté prohibido) mayores de 18 años al momento de participar. Empleados y familiares del Patrocinador no son elegibles.</p>

      <h2>3. Período del Sorteo</h2>
      <p>Continuo. Cada giro de la Ruleta constituye una participación individual.</p>

      <h2>4. Cómo Participar</h2>
      <p><strong>Método de Compra:</strong> Adquiere un paquete de Estrellas y gira la Ruleta.</p>
      <p><strong>Método Gratuito (AMOE):</strong> Envía el formulario de Participación Gratuita en la página de la Ruleta con un ensayo original de al menos 300 palabras. Cada envío otorga 1 Estrella gratuita. Una participación gratuita por persona/correo.</p>

      <h2>5. Premios</h2>
      <p>Los premios consisten en códigos canjeables (descuentos, envío gratis, productos gratuitos, sabores sorpresa). Valor estimado por giro: $0 – $25 USD. Sin valor en efectivo.</p>

      <h2>6. Selección del Ganador</h2>
      <p>Cada giro es independiente y aleatorio mediante un generador ponderado en el servidor.</p>

      <h2>7. Prize Pool Acumulado</h2>
      <p>El 50% del valor de cada compra de Estrellas se transfiere a un fondo común visible públicamente. La distribución de este pozo se rige por sorteos periódicos detallados en futuras actualizaciones de estas reglas.</p>

      <h2>8. Ley Aplicable</h2>
      <p>Este Sweepstakes se rige por las leyes del Estado de Delaware, EE.UU. NULO DONDE LA LEY LO PROHÍBA.</p>

      <h2>9. Lista de Ganadores</h2>
      <p>Disponible bajo solicitud a soporte@hazorex.com.</p>
    </main>
  );
}
