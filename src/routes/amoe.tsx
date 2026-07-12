import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/amoe")({
  head: () => ({
    meta: [
      { title: "Entrada Gratuita (AMOE) por Correo Postal — HAZOREX" },
      {
        name: "description",
        content:
          "Método Alternativo de Entrada Gratuita (AMOE) al sorteo diario de HAZOREX por correo postal físico (USPS). No se requiere compra.",
      },
      { name: "robots", content: "noindex,follow" },
      {
        property: "og:title",
        content: "Entrada Gratuita (AMOE) por Correo Postal — HAZOREX",
      },
      {
        property: "og:description",
        content:
          "Participa gratis en el sorteo diario enviando una tarjeta postal manuscrita según las reglas oficiales.",
      },
    ],
  }),
  component: AmoePage,
});

function AmoePage() {
  return (
    <main className="amoe-modal amoe-info">
      <Link to="/ruleta" className="amoe-close-btn" aria-label="Cerrar y volver a la Ruleta">
        ×
      </Link>

      <div className="amoe-header">
        <h2>Entrada Gratuita Oficial (AMOE) por Correo Postal</h2>
      </div>

      <p className="law-notice">
        <strong>
          NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE WILL NOT INCREASE YOUR CHANCES OF
          WINNING.
        </strong>
      </p>

      <p className="amoe-intro">
        Para obtener diez (10) estrellas de participación gratuita para el sorteo de hoy con el
        mismo peso que una entrada de pago, usted debe seguir estrictamente los siguientes pasos:
      </p>

      <section className="amoe-step">
        <h3>Paso 1 — Escribir a mano</h3>
        <p>
          Tome una tarjeta postal física (o una tarjeta de 3x5 pulgadas) y escriba claramente a
          mano y con su propio puño y letra los siguientes datos:
        </p>
        <ul>
          <li>Nombre y Apellidos completos</li>
          <li>Correo electrónico registrado en HAZOREX</li>
          <li>Número de teléfono móvil</li>
          <li>Fecha de nacimiento (Mínimo 18 años)</li>
          <li>Dirección residencial física completa</li>
        </ul>
      </section>

      <section className="amoe-step">
        <h3>Paso 2 — Dirección de envío</h3>
        <p>
          Coloque una estampilla postal válida en la tarjeta y envíela por correo físico de los
          Estados Unidos (USPS) a nuestra dirección oficial de recepción:
        </p>
        <address className="amoe-address">
          HAZOREX — Sorteos Oficiales
          <br />
          [Insertar PO Box en Nueva York]
        </address>
      </section>

      <section className="amoe-step">
        <h3>Paso 3 — Reglas de validación estrictas</h3>
        <ul>
          <li>Cada tarjeta postal enviada equivale a una sola solicitud de 10 estrellas.</li>
          <li>
            <strong>No se permiten envíos masivos:</strong> cada solicitud debe venir en una
            tarjeta postal individual con su propia estampilla independiente. Los sobres con
            múltiples tarjetas adentro serán descalificados automáticamente.
          </li>
          <li>
            No se aceptan copias impresas, reproducciones mecánicas ni texto generado por
            computadora. Todo debe ser manuscrito de forma auténtica.
          </li>
        </ul>
      </section>

      <p className="amoe-footnote">
        Consulta las{" "}
        <Link to="/sweepstakes-rules">Reglas Oficiales del Sorteo</Link> para más información.
      </p>
    </main>
  );
}
