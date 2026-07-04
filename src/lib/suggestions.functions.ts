import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["sugerencia", "queja", "idea", "otro"] as const;
type Category = (typeof CATEGORIES)[number];

const STATUSES = ["unread", "read", "resolved", "archived"] as const;
type Status = (typeof STATUSES)[number];

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No autorizado");
}

export const submitSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string; content: string; category?: string }) => {
    const content = String(d?.content ?? "").trim();
    if (content.length < 3) throw new Error("El contenido es demasiado corto");
    if (content.length > 4000) throw new Error("El contenido supera 4000 caracteres");
    const title = d?.title ? String(d.title).trim().slice(0, 200) : null;
    const cat = String(d?.category ?? "sugerencia") as Category;
    const category: Category = (CATEGORIES as readonly string[]).includes(cat) ? cat : "sugerencia";
    return { title, content, category };
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;

    // Enrich author info from profile (best-effort).
    let user_email: string | null = context.claims?.email ?? null;
    let user_name: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, full_name, email")
        .eq("id", context.userId)
        .maybeSingle();
      if (prof) {
        user_name = prof.display_name ?? prof.full_name ?? null;
        user_email = user_email ?? prof.email ?? null;
      }
    } catch {}

    const { error } = await supabase.from("suggestions").insert({
      user_id: context.userId,
      user_email,
      user_name,
      title: data.title,
      content: data.content,
      category: data.category,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) => ({
    status: d?.status && (STATUSES as readonly string[]).includes(d.status) ? (d.status as Status) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;
    let q = supabase
      .from("suggestions")
      .select("id, user_id, user_email, user_name, title, content, category, status, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { count: unread } = await supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread");

    return { suggestions: rows ?? [], unreadCount: unread ?? 0 };
  });

export const adminUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;
    const { count } = await supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread");
    return { unreadCount: count ?? 0 };
  });

export const adminMarkRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("suggestions")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "unread");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => {
    if (!(STATUSES as readonly string[]).includes(d.status)) throw new Error("Estado inválido");
    return { id: d.id, status: d.status as Status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status !== "unread" && !patch.read_at) patch.read_at = new Date().toISOString();
    const { error } = await supabase.from("suggestions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
