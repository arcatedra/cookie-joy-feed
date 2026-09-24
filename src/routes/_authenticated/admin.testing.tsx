import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/testing")({
  head: () => ({
    meta: [
      { title: "Pruebas — Admin Hazorex" },
      { name: "description", content: "Herramientas de prueba del panel de administración." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-xl p-6 text-sm">
      <h1 className="text-xl font-bold">Pruebas</h1>
      <p className="mt-2 text-muted-foreground">
        Hazorex ya no usa suscripciones, así que las herramientas de suscripción de prueba se quitaron.
      </p>
      <Link to="/profile" className="mt-4 inline-block underline">Volver</Link>
    </div>
  ),
});
