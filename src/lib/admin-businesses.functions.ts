/**
 * Server functions admin para gestión de negocios.
 * Todas requieren autenticación y rol admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listAllBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await (context.supabase as any)
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const approveInput = z.object({ id: z.string().uuid() });

export const approveBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => approveInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("businesses")
      .update({ status: "aprobado", rejection_reason: null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const rejectInput = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export const rejectBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => rejectInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("businesses")
      .update({ status: "rechazado", rejection_reason: data.reason })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const suspendInput = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3).max(500).optional(),
});

export const suspendBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => suspendInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("businesses")
      .update({ status: "suspendido", rejection_reason: data.reason ?? null })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
