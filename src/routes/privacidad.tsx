import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — Hazorex" },
      {
        name: "description",
        content:
          "Política de Privacidad de Hazorex: qué datos recopilamos, cómo los usamos y tus derechos.",
      },
      { property: "og:title", content: "Política de Privacidad — Hazorex" },
      { property: "og:url", content: "https://hazorex.com/privacidad" },
    ],
    links: [{ rel: "canonical", href: "https://hazorex.com/privacidad" }],
  }),
  component: PrivacyPage,
});

const BLUE = "#1e3a5f";

function PrivacyPage() {
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
        Política de Privacidad
      </h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        Última actualización: {lastUpdated}
      </p>

      <h2 style={{ marginTop: 32 }}>1. Quiénes somos</h2>
      <p>
        Hazorex (en adelante, "nosotros" o "la plataforma") opera el sitio web{" "}
        <strong>hazorex.com</strong>. Esta política explica qué información
        personal recopilamos, cómo la usamos y qué derechos tienes sobre ella.
      </p>

      <h2 style={{ marginTop: 32 }}>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, dirección de correo
          electrónico y foto de perfil cuando inicias sesión (por ejemplo, con
          Google).
        </li>
        <li>
          <strong>Datos de uso:</strong> páginas visitadas, interacciones con
          el sorteo y preferencias de notificación.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de navegador y
          sistema operativo, con fines de seguridad y diagnóstico.
        </li>
      </ul>

      <h2 style={{ marginTop: 32 }}>3. Para qué los usamos</h2>
      <ul>
        <li>Crear y mantener tu cuenta.</li>
        <li>Permitirte participar en el sorteo diario.</li>
        <li>Enviarte notificaciones que tú hayas autorizado.</li>
        <li>Prevenir fraude y abuso.</li>
        <li>Cumplir con obligaciones legales.</li>
      </ul>

      <h2 style={{ marginTop: 32 }}>4. Inicio de sesión con Google</h2>
      <p>
        Si te registras con Google, recibimos únicamente tu correo, tu nombre y
        tu foto de perfil. No accedemos a tu Gmail, contactos ni a ningún otro
        dato de tu cuenta Google.
      </p>

      <h2 style={{ marginTop: 32 }}>5. Compartir información</h2>
      <p>
        No vendemos tus datos. Solo los compartimos con proveedores que nos
        ayudan a operar la plataforma (hosting, envío de emails, analítica) y
        cuando la ley lo exige.
      </p>

      <h2 style={{ marginTop: 32 }}>6. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos en
        cualquier momento escribiendo a{" "}
        <a href="mailto:privacy@hazorex.com" style={{ color: BLUE }}>
          privacy@hazorex.com
        </a>
        .
      </p>

      <h2 style={{ marginTop: 32 }}>7. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu
        cuenta, borramos tu información personal salvo lo necesario para
        cumplir obligaciones legales.
      </p>

      <h2 style={{ marginTop: 32 }}>8. Cambios</h2>
      <p>
        Podemos actualizar esta política. Publicaremos cualquier cambio en esta
        misma página y, si es relevante, te lo notificaremos.
      </p>

      <h2 style={{ marginTop: 32 }}>9. Contacto</h2>
      <p>
        Para cualquier duda sobre privacidad:{" "}
        <a href="mailto:privacy@hazorex.com" style={{ color: BLUE }}>
          privacy@hazorex.com
        </a>
        .
      </p>
    </main>
  );
}
