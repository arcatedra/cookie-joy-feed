import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const taxIdSchema = z.object({
  taxIdType: z.enum(["ssn", "itin"]),
  taxId: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().regex(/^\d{9}$/)),
});

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

export const saveDriverTaxId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => taxIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const secret = process.env["DRIVER_TAX_ENCRYPTION_KEY"];
    if (!secret) throw new Error("Tax information encryption is unavailable");

    const keyMaterial = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(data.taxId),
    );

    const { error } = await context.supabase.from("driver_tax_profiles").upsert(
      {
        driver_id: context.userId,
        tax_id_type: data.taxIdType,
        tax_id_ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
        tax_id_iv: bytesToBase64(iv),
        tax_id_last4: data.taxId.slice(-4),
      },
      { onConflict: "driver_id" },
    );
    if (error) throw new Error("Could not securely save tax information");

    return { last4: data.taxId.slice(-4) };
  });