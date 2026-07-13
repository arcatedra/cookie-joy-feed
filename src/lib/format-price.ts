/**
 * Unified price formatting utility.
 *
 * All monetary values in HAZOREX are denominated in USD, so we render them
 * with the en-US locale (period as decimal separator) regardless of the UI
 * language. This avoids showing "$19,99" in some places and "$19.99" in
 * others.
 */
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_FORMATTER_NO_DECIMALS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a USD amount as "$19.99". Accepts dollars (number). */
export function formatPrice(amount: number, opts?: { hideDecimalsWhenInteger?: boolean }): string {
  if (!Number.isFinite(amount)) return "$0.00";
  if (opts?.hideDecimalsWhenInteger && Number.isInteger(amount)) {
    return USD_FORMATTER_NO_DECIMALS.format(amount);
  }
  return USD_FORMATTER.format(amount);
}

/** Format a USD amount stored in cents. */
export function formatPriceFromCents(cents: number): string {
  return formatPrice(cents / 100);
}
