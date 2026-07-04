import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("customer_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("customer_notifications")
      .select("id, type, issue_id, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { notifications: data ?? [] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("customer_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConversationByIssue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { issueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: issue, error: e1 } = await supabase
      .from("order_item_issues")
      .select("*")
      .eq("id", data.issueId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!issue) throw new Error("Issue no encontrada");
    if (issue.user_id !== userId) {
      // admin allowed by RLS anyway; extra guard for typical customer view
    }
    const { data: conv, error: e2 } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("issue_id", issue.id)
      .maybeSingle();
    if (e2) throw new Error(e2.message);
    if (!conv) throw new Error("Conversación no encontrada");
    const { data: messages, error: e3 } = await supabase
      .from("support_messages")
      .select("id, sender, body, action, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if (e3) throw new Error(e3.message);
    return { issue, conversation: conv, messages: messages ?? [] };
  });

export const sendCustomerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; body: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const body = data.body.trim().slice(0, 2000);
    if (!body) throw new Error("Mensaje vacío");
    const { error } = await supabase
      .from("support_messages")
      .insert({ conversation_id: data.conversationId, sender: "customer", body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function resolveIssue(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  userId: string,
  issueId: string,
  action: "accept_replacement" | "cancel_item",
) {
  const { data: issue, error } = await supabase
    .from("order_item_issues")
    .select("*")
    .eq("id", issueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!issue) throw new Error("Issue no encontrada");
  if (issue.user_id !== userId) throw new Error("No autorizado");
  if (issue.status !== "pending") throw new Error("La incidencia ya fue resuelta");

  const { data: order, error: eo } = await supabase
    .from("orders")
    .select("id, items, subtotal_usd, tax_usd, shipping_usd, total_usd, status")
    .eq("id", issue.order_id)
    .maybeSingle();
  if (eo) throw new Error(eo.message);
  if (!order) throw new Error("Pedido no encontrado");

  const items = Array.isArray(order.items) ? [...(order.items as any[])] : [];
  const idx = issue.item_index as number;

  if (action === "accept_replacement") {
    if (!issue.replacement_name) throw new Error("Sin reemplazo definido");
    if (items[idx]) {
      items[idx] = {
        ...items[idx],
        name: issue.replacement_name,
        price: Number(issue.replacement_price ?? items[idx].price ?? 0),
        replaced_from: issue.product_name,
      };
    }
  } else {
    if (items[idx]) items.splice(idx, 1);
  }

  const subtotal = items.reduce(
    (s: number, it: any) => s + Number(it.price ?? 0) * Number(it.qty ?? 1),
    0,
  );
  const shipping = Number(order.shipping_usd ?? 0);
  const tax = Number(order.tax_usd ?? 0);
  const total = subtotal + shipping + tax;

  const orderUpdate: Record<string, unknown> = {
    items,
    subtotal_usd: subtotal,
    total_usd: total,
  };
  if (items.length === 0) orderUpdate.status = "cancelled";

  const { error: eu } = await supabase
    .from("orders")
    .update(orderUpdate)
    .eq("id", order.id);
  if (eu) throw new Error(eu.message);

  const { error: ei } = await supabase
    .from("order_item_issues")
    .update({
      status: action === "accept_replacement" ? "replaced" : "cancelled",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", issue.id);
  if (ei) throw new Error(ei.message);

  const { data: conv } = await supabase
    .from("support_conversations")
    .select("id")
    .eq("issue_id", issue.id)
    .maybeSingle();
  if (conv) {
    const msg =
      action === "accept_replacement"
        ? `✅ Aceptaste el reemplazo por ${issue.replacement_name}. Ajustamos tu pedido y lo prepararemos con este producto.`
        : `❌ Cancelamos ${issue.product_name} de tu pedido. Si ya lo pagaste, procesaremos el reembolso correspondiente.`;
    await supabase
      .from("support_messages")
      .insert([
        { conversation_id: conv.id, sender: "customer", body: action === "accept_replacement" ? "Acepto el reemplazo" : "Prefiero cancelar", action },
        { conversation_id: conv.id, sender: "system", body: msg },
      ]);
    await supabase
      .from("support_conversations")
      .update({ status: "closed" })
      .eq("id", conv.id);
  }

  return { ok: true, action };
}

export const acceptReplacement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { issueId: string }) => d)
  .handler(async ({ data, context }) =>
    resolveIssue(context.supabase as any, context.userId, data.issueId, "accept_replacement"),
  );

export const cancelIssueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { issueId: string }) => d)
  .handler(async ({ data, context }) =>
    resolveIssue(context.supabase as any, context.userId, data.issueId, "cancel_item"),
  );
