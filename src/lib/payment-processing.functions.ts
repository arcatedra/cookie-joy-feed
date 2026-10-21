import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public, read-only arithmetic: no customer data, writes or Stripe calls. */
export const quotePaymentProcessing = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ baseCents: z.number().int().min(0).max(100_000_000) }).parse(raw))
  .handler(async ({ data }) => {
    const { cardPaymentQuote } = await import("./payment-processing.server");
    return cardPaymentQuote(data.baseCents);
  });