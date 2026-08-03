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
