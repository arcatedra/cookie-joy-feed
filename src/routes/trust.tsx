import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Confianza, privacidad y seguridad — AMYRAX" },
      {
        name: "description",
        content:
          "Cómo AMYRAX protege tus datos: autenticación, controles de acceso, pagos, retención de datos, subprocesadores y cómo ejercer tus derechos de privacidad.",
      },
    ],
  }),
  component: TrustPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:py-14">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Confianza</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacidad y seguridad en AMYRAX
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta página es mantenida por el equipo de AMYRAX para responder preguntas frecuentes sobre
          seguridad y privacidad. No constituye una certificación independiente; describe los
          controles actualmente activos en la aplicación y la responsabilidad compartida entre
          AMYRAX, nuestra plataforma de alojamiento (Lovable Cloud) y nuestros usuarios.
        </p>
      </header>

      <div className="space-y-8">
        <Section title="Autenticación y acceso">
          <p>
            El acceso a cuentas se realiza con correo y contraseña o con inicio de sesión de
            Google. Las contraseñas nunca se almacenan en texto plano: la gestión y verificación de
            credenciales corre a cargo del proveedor de autenticación gestionado por la plataforma.
          </p>
          <p>
            Cada usuario solo puede leer y modificar su propio perfil y sus propios pedidos,
            suscripciones y donaciones. Los roles administrativos están restringidos y se verifican
            del lado del servidor.
          </p>
        </Section>

        <Section title="Pagos">
          <p>
            Los pagos se procesan a través de Stripe. AMYRAX no almacena ni tiene acceso a números
            completos de tarjeta, CVV o fechas de expiración: estos datos viajan directamente entre
            tu navegador y Stripe usando sus elementos seguros.
          </p>
        </Section>

        <Section title="Datos que recopilamos">
          <p>
            Recopilamos únicamente los datos necesarios para operar la aplicación: tu correo, un
            nombre para mostrar opcional, tu dirección de envío cuando realizas una compra física,
            y un historial de pedidos, suscripciones y donaciones asociado a tu cuenta.
          </p>
        </Section>

        <Section title="Subprocesadores">
          <p>
            Para prestar el servicio dependemos de los siguientes subprocesadores: Lovable Cloud
            (alojamiento, base de datos y autenticación), Stripe (procesamiento de pagos) y un
            proveedor de envío transaccional de correos. Cada uno solo recibe los datos mínimos
            necesarios para su función.
          </p>
        </Section>

        <Section title="Correos electrónicos">
          <p>
            Enviamos únicamente correos transaccionales (confirmaciones de pedido, suscripción y
            cambios de cuenta). No realizamos campañas de marketing masivo. Cada correo incluye un
            enlace de baja que desactiva futuros envíos a esa dirección.
          </p>
        </Section>

        <Section title="Retención y borrado de datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Si deseas eliminar tu cuenta o
            solicitar la eliminación de tus datos personales, escríbenos al correo de contacto del
            sitio y procesaremos la solicitud.
          </p>
        </Section>

        <Section title="Cómo reportar un problema de seguridad">
          <p>
            Si crees haber encontrado una vulnerabilidad, por favor escríbenos antes de divulgarla
            públicamente. Investigaremos cada reporte responsable y te mantendremos al tanto del
            estado.
          </p>
        </Section>

        <Section title="Responsabilidad compartida">
          <p>
            La plataforma sobre la que se ejecuta AMYRAX provee capacidades de seguridad de
            infraestructura, copias de respaldo y aislamiento de datos. AMYRAX configura los
            controles a nivel de aplicación (políticas de acceso, validación de pagos, contenido
            de correos). Los usuarios contribuyen usando contraseñas únicas y manteniendo seguro
            su acceso a su correo.
          </p>
        </Section>
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          ← Volver al inicio
        </Link>
      </footer>
    </div>
  );
}
