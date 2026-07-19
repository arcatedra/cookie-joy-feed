import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const clienteSchema = z.object({
  nombre_completo: z.string().trim().min(2).max(200),
  telefono: z.string().trim().max(40).nullable().optional(),
  direccion_linea1: z.string().trim().max(200).nullable().optional(),
  direccion_linea2: z.string().trim().max(200).nullable().optional(),
  ciudad: z.string().trim().max(120).nullable().optional(),
  estado_provincia: z.string().trim().max(120).nullable().optional(),
  codigo_postal: z.string().trim().max(20).nullable().optional(),
  pais: z.string().trim().max(80).nullable().optional(),
});

export type ClienteFormInput = z.infer<typeof clienteSchema>;

export const getMyCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
      claims?: { email?: string };
    };
    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id,nombre_completo,email,telefono,direccion_linea1,direccion_linea2,ciudad,estado_provincia,codigo_postal,pais,creado_en,actualizado_en",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data;

    // Auto-heal: create the row if missing (users signed up before the trigger).
    const email = claims?.email ?? "";
    const { data: inserted, error: insErr } = await supabase
      .from("clientes")
      .insert({ id: userId, email, nombre_completo: email.split("@")[0] || "Cliente" })
      .select(
        "id,nombre_completo,email,telefono,direccion_linea1,direccion_linea2,ciudad,estado_provincia,codigo_postal,pais,creado_en,actualizado_en",
      )
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

export const upsertMyCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clienteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const payload = {
      nombre_completo: data.nombre_completo,
      telefono: data.telefono ?? null,
      direccion_linea1: data.direccion_linea1 ?? null,
      direccion_linea2: data.direccion_linea2 ?? null,
      ciudad: data.ciudad ?? null,
      estado_provincia: data.estado_provincia ?? null,
      codigo_postal: data.codigo_postal ?? null,
      pais: data.pais ?? null,
    };
    const { data: updated, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", userId)
      .select(
        "id,nombre_completo,email,telefono,direccion_linea1,direccion_linea2,ciudad,estado_provincia,codigo_postal,pais,actualizado_en",
      )
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });
