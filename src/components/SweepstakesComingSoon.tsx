import { Link } from "@tanstack/react-router";

/**
 * Placeholder mostrado en las rutas de sorteo/ruleta mientras
 * `sweepstakesEnabled` esté en false. No borra nada: al reactivar el flag
 * vuelve a renderizarse la página original.
 */
export function SweepstakesComingSoon() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c9a36b]">HAZOREX</p>
      <h1 className="mt-3 text-2xl font-black text-[#1e3a5f] md:text-3xl">Próximamente</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#4b5563]">
        Esta sección no está disponible por ahora. Mientras tanto puedes seguir comprando
        nuestras galletas artesanales.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/shop"
          className="rounded-full bg-[#1e3a5f] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#2a4a73]"
        >
          Ir a la tienda
        </Link>
        <Link
          to="/"
          className="rounded-full border border-[#1e3a5f]/30 px-5 py-2 text-xs font-bold text-[#1e3a5f] transition hover:bg-[#1e3a5f]/5"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
