import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Compatibility endpoint: never accepts or persists local fiscal data.
export const saveDriverTaxId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((_input: unknown) => { throw new Error("Los datos fiscales se proporcionan únicamente en Stripe."); })
  .handler(async () => { throw new Error("Usa el registro de cobros de Stripe."); });
