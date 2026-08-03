/**
 * Flags globales de funcionalidades.
 *
 * sweepstakesEnabled:
 *   false → oculta TODAS las superficies de sorteo / ruleta de la vista del
 *   usuario (banners, enlaces de nav y footer, hero CTA, y las rutas
 *   /ruleta, /historial, /sorteo/ganadores, /sweepstakes-rules, /amoe y
 *   /claim/$drawDate muestran "Próximamente" en vez de 404).
 *
 *   Nada se borra: tablas, datos, server functions, hooks y componentes
 *   siguen intactos. Cambiar a `true` reactiva todo tal como estaba.
 */
export const sweepstakesEnabled = false;

/**
 * Metadatos genéricos usados por las rutas de sorteo cuando el flag está
 * apagado, para que el <title> y la meta description no mencionen el sorteo.
 * Al volver `sweepstakesEnabled` a true, cada ruta usa de nuevo su head original.
 */
export const comingSoonMeta = [
  { title: "Próximamente — HAZOREX" },
  { name: "description", content: "Esta sección no está disponible por ahora." },
  { name: "robots", content: "noindex,follow" },
  { property: "og:title", content: "Próximamente — HAZOREX" },
  { property: "og:description", content: "Esta sección no está disponible por ahora." },
];
