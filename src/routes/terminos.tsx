import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos del Servicio — Hazorex" },
      {
        name: "description",
        content:
          "Términos y condiciones de uso de la plataforma Hazorex.",
      },
      { property: "og:title", content: "Términos del Servicio — Hazorex" },
      { property: "og:url", content: "https://hazorex.com/terminos" },
    ],
    links: [{ rel: "canonical", href: "https://hazorex.com/terminos" }],
  }),
  component: TermsEsPage,
});

const BLUE = "#1e3a5f";

function TermsEsPage() {
  const lastUpdated = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.7,
        color: BLUE,
      }}
    >
      <Link to="/" style={{ color: BLUE }}>← Volver al inicio</Link>
      <h1 style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>
        Términos del Servicio
      </h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        Última actualización: {lastUpdated}
      </p>

      <h2 style={{ marginTop: 32 }}>1. Aceptación</h2>
      <p>
        Al acceder o utilizar Hazorex (hazorex.com) aceptas estos Términos del
        Servicio. Si no estás de acuerdo, no utilices la plataforma.
      </p>

      <h2 style={{ marginTop: 32 }}>2. La plataforma</h2>
      <p>
        Hazorex es una plataforma que ofrece, entre otras funciones, un sorteo
        diario abierto a usuarios registrados. La participación está sujeta a
        las reglas publicadas en la propia plataforma.
      </p>

      <h2 style={{ marginTop: 32 }}>3. Cuenta de usuario</h2>
      <ul>
        <li>Debes proporcionar información veraz al registrarte.</li>
        <li>Eres responsable de la seguridad de tu cuenta.</li>
        <li>Una persona solo puede mantener una cuenta activa.</li>
        <li>
          Podemos suspender cuentas que infrinjan estos términos o intenten
          manipular los resultados del sorteo.
        </li>
      </ul>

      <h2 style={{ marginTop: 32 }}>4. Uso aceptable</h2>
      <p>
        Está prohibido usar la plataforma para actividades ilícitas, intentar
        eludir las medidas de seguridad, automatizar el acceso sin autorización
        o manipular los sorteos.
      </p>

      <h2 style={{ marginTop: 32 }}>5. Sorteos</h2>
      <p>
        Los sorteos son aleatorios y verificables. Ningún miembro del equipo
        puede elegir, forzar ni alterar al ganador. Las bases específicas de
        cada sorteo se publican en la propia plataforma.
      </p>

      <h2 style={{ marginTop: 32 }}>6. Propiedad intelectual</h2>
      <p>
        Todo el contenido, marca y software de Hazorex están protegidos. No
        puedes copiarlos, redistribuirlos ni crear obras derivadas sin nuestro
        permiso por escrito.
      </p>

      <h2 style={{ marginTop: 32 }}>7. Limitación de responsabilidad</h2>
      <p>
        La plataforma se ofrece "tal cual". En la medida que la ley lo permita,
        Hazorex no se hace responsable de daños indirectos derivados del uso de
        la plataforma.
      </p>

      <h2 style={{ marginTop: 32 }}>8. Cambios</h2>
      <p>
        Podemos modificar estos términos. Los cambios entrarán en vigor cuando
        se publiquen en esta página. El uso continuado implica aceptación.
      </p>

      <h2 style={{ marginTop: 32 }}>9. Contacto</h2>
      <p>
        Cualquier pregunta sobre estos términos:{" "}
        <a href="mailto:legal@hazorex.com" style={{ color: BLUE }}>
          legal@hazorex.com
        </a>
        .
      </p>
    </main>
  );
}
