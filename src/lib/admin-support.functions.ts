import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No autorizado");
}

export const adminListRecentOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (context.supabase as any)
      .from("orders")
      .select("id, email, items, total_usd, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const adminListIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (context.supabase as any)
      .from("order_item_issues")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { issues: data ?? [] };
  });

export const adminGetConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { issueId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("issue_id", data.issueId)
      .maybeSingle();
    if (!conv) return { conversation: null, messages: [] };
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, sender, body, action, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    return { conversation: conv, messages: msgs ?? [] };
  });

export const adminMarkProductUnavailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      orderId: string;
      itemIndex: number;
      replacementName?: string;
      replacementPrice?: number;
      replacementImage?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase as any;

    const { data: order, error: eo } = await supabase
      .from("orders")
      .select("id, user_id, items")
      .eq("id", data.orderId)
      .maybeSingle();
    if (eo) throw new Error(eo.message);
    if (!order) throw new Error("Pedido no encontrado");

    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    const item = items[data.itemIndex];
    if (!item) throw new Error("Item inválido");

    const { data: issue, error } = await supabase
      .from("order_item_issues")
      .insert({
        order_id: order.id,
        user_id: order.user_id,
        item_index: data.itemIndex,
        product_name: item.name ?? "Producto",
        original_price: Number(item.price ?? 0),
        original_qty: Number(item.qty ?? 1),
        replacement_name: data.replacementName ?? null,
        replacement_price: data.replacementPrice ?? null,
        replacement_image: data.replacementImage ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { issueId: issue.id };
  });
