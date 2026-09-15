/**
 * Preferencias de sustitución: qué hacer si un artículo no está disponible
 * cuando el pedido se está preparando.
 */
export type SubstitutionMode = "best_match" | "specific" | "refund";

export const SUBSTITUTION_MODES: SubstitutionMode[] = [
  "best_match",
  "specific",
  "refund",
];

export const DEFAULT_SUBSTITUTION_MODE: SubstitutionMode = "best_match";

/** Máximo de alternativas que el cliente puede elegir. */
export const MAX_SUBSTITUTES = 3;

/** Minutos que espera el sistema la respuesta del cliente. */
export const SUBSTITUTION_TIMEOUT_MINUTES = 10;

export function isSubstitutionMode(v: unknown): v is SubstitutionMode {
  return typeof v === "string" && (SUBSTITUTION_MODES as string[]).includes(v);
}

/** Minutos/segundos restantes del reloj de 10 minutos (0 si ya venció). */
export function secondsLeft(notifiedAt: string | null, now = Date.now()): number {
  if (!notifiedAt) return SUBSTITUTION_TIMEOUT_MINUTES * 60;
  const deadline =
    new Date(notifiedAt).getTime() + SUBSTITUTION_TIMEOUT_MINUTES * 60_000;
  return Math.max(0, Math.round((deadline - now) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
