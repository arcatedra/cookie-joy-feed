import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, HelpCircle, ShoppingBag, Truck, RotateCcw, Trophy } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Atención al cliente — HAZOREX" },
      { name: "description", content: "Contacta con el equipo de soporte de HAZOREX. Correo, preguntas frecuentes sobre pedidos, entregas, suscripciones y sorteo." },
      { property: "og:title", content: "Atención al cliente — HAZOREX" },
      { property: "og:description", content: "Estamos aquí para ayudarte. Escríbenos a soporte@hazorex.com." },
    ],
  }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "soporte@hazorex.com";

const faqs = [
  {
    Icon: ShoppingBag,
    q: "¿Cómo hago un pedido?",
    a: "Elige tus productos en la tienda, añádelos a la cesta y completa el pago desde el carrito. Recibirás confirmación por correo con los detalles.",
  },
  {
    Icon: Truck,
    q: "¿Cuánto tarda la entrega?",
    a: "Los tiempos de entrega dependen de tu zona. Recibirás actualizaciones por correo con el estado de tu envío en cada etapa.",
  },
  {
    Icon: RotateCcw,
    q: "¿Cómo cancelo mi suscripción?",
    a: "Entra en tu perfil, ve a la sección de suscripción activa y pulsa cancelar. Si necesitas ayuda, escríbenos a soporte@hazorex.com.",
  },
  {
    Icon: Trophy,
    q: "¿Cómo participo en el sorteo diario?",
    a: "Puedes participar cada día de forma gratuita desde la página del sorteo. Consulta las reglas oficiales en /sweepstakes-rules.",
  },
];

function SupportPage() {
  return (
    <main className="min-h-screen bg-background pb-24">
      <section className="bg-primary px-5 pt-12 pb-16 text-primary-foreground">
        <h1 className="text-3xl font-bold tracking-tight">¿En qué podemos ayudarte?</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Nuestro equipo está aquí para resolver cualquier duda sobre tus pedidos,
          entregas, suscripción o el sorteo diario.
        </p>
      </section>

      <section className="mx-auto -mt-10 max-w-3xl px-5">
        <div className="rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border">
          <h2 className="text-lg font-bold text-card-foreground">Contáctanos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Respondemos en horario laboral, normalmente en menos de 24 horas.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-accent"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Correo
                </p>
                <p className="text-sm font-bold text-card-foreground">{SUPPORT_EMAIL}</p>
              </div>
            </a>

            <Link
              to="/suggestions"
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:bg-accent"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Buzón
                </p>
                <p className="text-sm font-bold text-card-foreground">Envía una sugerencia</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-3xl px-5">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Preguntas frecuentes</h2>
        </div>
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className={`group px-5 py-4 ${i !== faqs.length - 1 ? "border-b border-border" : ""}`}
            >
              <summary className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-card-foreground">
                <f.Icon className="h-4 w-4 text-muted-foreground" />
                {f.q}
              </summary>
              <p className="mt-2 pl-7 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿No encontraste lo que buscabas? Escríbenos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
