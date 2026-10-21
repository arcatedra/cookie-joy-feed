/** USD cents only. This module must never enter the browser bundle. */
export function paymentProcessingCents(baseCents: number): number {
  if (!Number.isSafeInteger(baseCents) || baseCents < 0 || baseCents > 100_000_000) {
    throw new Error("El total para calcular el cargo no es válido.");
  }
  if (baseCents === 0) return 0;
  // Equivalent to round(((base USD + .30) / .971 - base USD) * 100).
  return Math.round((baseCents * 29 + 30_000) / 971);
}

export function cardPaymentQuote(baseCents: number, version: number | null = 1) {
  const feeCents = version === 1 ? paymentProcessingCents(baseCents) : 0;
  return { baseCents, feeCents, totalCents: baseCents + feeCents };
}

export function assertProcessingQuote(expected: number | undefined, actual: number) {
  if (expected !== undefined && expected !== actual) {
    throw new Error("El total cambió. Revisa el cargo por procesamiento y vuelve a pagar.");
  }
}