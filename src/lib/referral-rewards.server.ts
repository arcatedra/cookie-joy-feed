/**
 * Bono de referido: $5 al saldo de quien invitó cuando el invitado
 * completa su PRIMERA compra y el pedido queda entregado.
 *
 * Solo se ejecuta en el servidor con privilegios (nunca desde el navegador).
 */
import { pricingFromRows } from "./pricing";

function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 120);
}

function normPhone(s: unknown): string {
  return String(s ?? "").replace(/\D/g, "").slice(-10);
}

/**
 * Se llama cuando un pedido de tienda pasa a 'entregado'.
 * Es idempotente: referral_rewards tiene el invitado como clave única.
 */
export async function grantReferralRewardForOrder(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: order } = await db
      .from("store_orders")
      .select("id, cliente_id, estado, direccion_envio, created_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.estado !== "entregado") return;

    const refereeId = order.cliente_id as string;

    // ¿Ya se procesó este invitado?
    const { data: existing } = await db
      .from("referral_rewards")
      .select("id")
      .eq("referee_id", refereeId)
      .maybeSingle();
    if (existing) return;

    // ¿Es su PRIMERA compra entregada?
    const { data: earlier } = await db
      .from("store_orders")
      .select("id")
      .eq("cliente_id", refereeId)
      .eq("estado", "entregado")
      .lt("created_at", order.created_at)
      .limit(1);
    if ((earlier ?? []).length > 0) return;

    // ¿Quién lo invitó?
    const { data: profile } = await db
      .from("profiles")
      .select("id, referred_by")
      .eq("id", refereeId)
      .maybeSingle();
    const referrerId = profile?.referred_by as string | undefined;
    if (!referrerId) return;

    // Nadie puede usar su propio código
    if (referrerId === refereeId) {
      await db.from("referral_rewards").insert({
        referrer_id: referrerId,
        referee_id: refereeId,
        status: "bloqueado",
        block_reason: "auto_referido",
        order_id: orderId,
      });
      return;
    }

    // ---- Antifraude: teléfono / dirección repetidos --------------------
    const { data: cliente } = await db
      .from("clientes")
      .select("telefono")
      .eq("id", refereeId)
      .maybeSingle();

    const addr = (order.direccion_envio ?? {}) as Record<string, unknown>;
    const fingerprints: Array<{ kind: string; value_norm: string }> = [];
    const phone = normPhone(cliente?.telefono);
    if (phone.length === 10) fingerprints.push({ kind: "telefono", value_norm: phone });
    const address = norm(`${addr.street ?? ""}${addr.apt ?? ""}${addr.zip ?? ""}`);
    if (address.length > 5) fingerprints.push({ kind: "direccion", value_norm: address });

    let blockReason: string | null = null;
    for (const fp of fingerprints) {
      const { data: dupes } = await db
        .from("account_fingerprints")
        .select("user_id")
        .eq("kind", fp.kind)
        .eq("value_norm", fp.value_norm)
        .neq("user_id", refereeId)
        .limit(1);
      if ((dupes ?? []).length > 0) blockReason = `duplicado_${fp.kind}`;
      await db
        .from("account_fingerprints")
        .upsert(
          { user_id: refereeId, kind: fp.kind, value_norm: fp.value_norm },
          { onConflict: "user_id,kind,value_norm" },
        );
    }

    if (blockReason) {
      await db.from("referral_rewards").insert({
        referrer_id: referrerId,
        referee_id: refereeId,
        status: "bloqueado",
        block_reason: blockReason,
        order_id: orderId,
      });
      return;
    }

    // ---- Bono -----------------------------------------------------------
    const { data: rows } = await db.from("pricing_settings").select("key, value");
    const amount = pricingFromRows(rows).referralBonusUsd;

    const { error: rewardErr } = await db.from("referral_rewards").insert({
      referrer_id: referrerId,
      referee_id: refereeId,
      status: "pagado",
      order_id: orderId,
      amount_usd: amount,
    });
    if (rewardErr) return; // carrera: ya existe

    await db.from("wallet_credits").insert({
      user_id: referrerId,
      amount_usd: amount,
      reason: "referido",
      order_id: orderId,
    });
  } catch (e) {
    console.error("[referral-rewards] no se pudo procesar el bono", e);
  }
}
