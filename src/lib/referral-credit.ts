/** Credit never consumes the funds belonging to the merchant or driver. */
export function spendableOrderCreditCents(balanceCents: number, grossCents: number, platformCents: number): number {
  return Math.max(0, Math.min(Math.max(0, balanceCents), Math.max(0, grossCents - 100), Math.max(0, platformCents)));
}