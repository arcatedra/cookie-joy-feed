import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INSTANT_PAYOUT_FEE_RATE = 0.015; // 1.5%
const INSTANT_PAYOUT_MIN = 5;

export const getWalletSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Available balance = earned but not paid out
    const { data: earnings, error: eErr } = await supabase
      .from("driver_order_earnings")
      .select("total_amount, paid_out_at, earned_at")
      .eq("driver_id", userId);
    if (eErr) throw new Error(eErr.message);

    let available = 0;
    let lifetime = 0;
    let deliveriesLifetime = 0;
    let weekEarnings = 0;
    let weekDeliveries = 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const e of earnings ?? []) {
      const amt = Number(e.total_amount);
      lifetime += amt;
      deliveriesLifetime += 1;
      if (!e.paid_out_at) available += amt;
      if (new Date(e.earned_at).getTime() >= weekAgo) {
        weekEarnings += amt;
        weekDeliveries += 1;
      }
    }

    // Pending instant payouts reduce spendable balance
    const { data: pendingPayouts } = await supabase
      .from("driver_instant_payouts")
      .select("amount, status")
      .eq("driver_id", userId)
      .in("status", ["pending", "approved"]);
    const holdAmount = (pendingPayouts ?? []).reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    // Next scheduled payout: next Friday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextPayout = new Date(now);
    nextPayout.setDate(now.getDate() + daysUntilFriday);
    nextPayout.setHours(18, 0, 0, 0);

    return {
      available_balance: Number((available - holdAmount).toFixed(2)),
      pending_hold: Number(holdAmount.toFixed(2)),
      lifetime_earnings: Number(lifetime.toFixed(2)),
      lifetime_deliveries: deliveriesLifetime,
      week_earnings: Number(weekEarnings.toFixed(2)),
      week_deliveries: weekDeliveries,
      next_scheduled_payout_at: nextPayout.toISOString(),
      instant_payout_fee_rate: INSTANT_PAYOUT_FEE_RATE,
      instant_payout_min: INSTANT_PAYOUT_MIN,
    };
  });

export const listOrderEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("driver_order_earnings")
      .select(
        "id, order_id, base_amount, tip_amount, bonus_amount, distance_amount, total_amount, distance_km, earned_at, paid_out_at, courier_orders(pickup_address)",
      )
      .eq("driver_id", userId)
      .order("earned_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      order_id: r.order_id,
      base_amount: Number(r.base_amount),
      tip_amount: Number(r.tip_amount),
      bonus_amount: Number(r.bonus_amount),
      distance_amount: Number(r.distance_amount),
      total_amount: Number(r.total_amount),
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      earned_at: r.earned_at,
      paid_out_at: r.paid_out_at,
      pickup_address:
        (r.courier_orders as { pickup_address?: string } | null)?.pickup_address ??
        null,
    }));
  });

export const listPayoutMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("driver_payout_methods")
      .select("*")
      .eq("driver_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      method_type: "bank_transfer" | "paypal" | "yappy" | "other";
      display_label: string;
      account_holder: string;
      account_details: Record<string, string>;
      is_default?: boolean;
    }) => ({
      method_type: z
        .enum(["bank_transfer", "paypal", "yappy", "other"])
        .parse(d.method_type),
      display_label: z.string().min(2).max(80).parse(d.display_label),
      account_holder: z.string().min(2).max(120).parse(d.account_holder),
      account_details: z
        .record(z.string(), z.string().max(200))
        .parse(d.account_details),
      is_default: z.boolean().optional().parse(d.is_default) ?? false,
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("driver_payout_methods")
      .select("id")
      .eq("driver_id", userId)
      .limit(1);
    const isFirst = !existing || existing.length === 0;
    const { data: row, error } = await supabase
      .from("driver_payout_methods")
      .insert({
        driver_id: userId,
        method_type: data.method_type,
        display_label: data.display_label,
        account_holder: data.account_holder,
        account_details: data.account_details,
        is_default: isFirst ? true : data.is_default,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setDefaultPayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("driver_payout_methods")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("driver_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePayoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("driver_payout_methods")
      .delete()
      .eq("id", data.id)
      .eq("driver_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInstantPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("driver_instant_payouts")
      .select("*, driver_payout_methods(display_label, method_type)")
      .eq("driver_id", userId)
      .order("requested_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const requestInstantPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; payout_method_id: string }) => ({
    amount: z.number().positive().max(10000).parse(d.amount),
    payout_method_id: z.string().uuid().parse(d.payout_method_id),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    if (data.amount < INSTANT_PAYOUT_MIN) {
      throw new Error(`El monto mínimo para cobro instantáneo es $${INSTANT_PAYOUT_MIN}`);
    }

    // Verify method belongs to driver
    const { data: method, error: mErr } = await supabase
      .from("driver_payout_methods")
      .select("id")
      .eq("id", data.payout_method_id)
      .eq("driver_id", userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!method) throw new Error("Método de pago no encontrado");

    // Check balance
    const { data: earnings } = await supabase
      .from("driver_order_earnings")
      .select("total_amount")
      .eq("driver_id", userId)
      .is("paid_out_at", null);
    const available = (earnings ?? []).reduce(
      (s, e) => s + Number(e.total_amount),
      0,
    );

    const { data: pending } = await supabase
      .from("driver_instant_payouts")
      .select("amount")
      .eq("driver_id", userId)
      .in("status", ["pending", "approved"]);
    const held = (pending ?? []).reduce((s, p) => s + Number(p.amount), 0);

    const spendable = available - held;
    if (data.amount > spendable) {
      throw new Error(
        `Balance insuficiente. Disponible: $${spendable.toFixed(2)}`,
      );
    }

    const fee = Number((data.amount * INSTANT_PAYOUT_FEE_RATE).toFixed(2));
    const net = Number((data.amount - fee).toFixed(2));

    const { data: row, error } = await supabase
      .from("driver_instant_payouts")
      .insert({
        driver_id: userId,
        payout_method_id: data.payout_method_id,
        amount: data.amount,
        fee_amount: fee,
        net_amount: net,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, fee_amount: fee, net_amount: net };
  });

export const cancelInstantPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("driver_instant_payouts")
      .update({ status: "cancelled", processed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("driver_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
