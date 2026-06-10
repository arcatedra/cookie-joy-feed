// Client-safe tier helpers — usable in components and server fns.

export type DonationTier =
  | "azul"
  | "bronce"
  | "oro"
  | "premium"
  | "corona"
  | "estrella_suprema";

export const TIER_RANK: Record<DonationTier, number> = {
  azul: 1,
  bronce: 2,
  oro: 3,
  premium: 4,
  corona: 5,
  estrella_suprema: 6,
};

/** Returns the tier for a USD amount, or null if amount < $1. */
export function tierForAmount(amount: number): DonationTier | null {
  if (!Number.isFinite(amount) || amount < 1) return null;
  if (amount <= 4) return "azul";
  if (amount <= 19) return "bronce";
  if (amount <= 99) return "oro";
  if (amount <= 499) return "premium";
  if (amount === 500) return "corona";
  return "estrella_suprema"; // > 500
}

export const TIER_LABEL: Record<DonationTier, string> = {
  azul: "Azul",
  bronce: "Bronce",
  oro: "Oro",
  premium: "Premium",
  corona: "Corona",
  estrella_suprema: "Estrella Suprema",
};

export const TIER_ICON: Record<DonationTier, string> = {
  azul: "💧",
  bronce: "🥉",
  oro: "🥇",
  premium: "💎",
  corona: "👑",
  estrella_suprema: "✨",
};

export const DONATION_PRESETS = [1, 5, 20, 100, 500, 1000] as const;
