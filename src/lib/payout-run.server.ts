/** Ejecución de pagos automáticos (súpers + repartidores) con registro. */
const MAX_ROWS = 200;

export async function runPayouts(source: "cron" | "manual") {
  const { adminDb, transferDriverPayout, transferStoreOrder, storeShareCents, money } = await import(
    "./payouts.server"
  );
  const db = adminDb();
  const errors: { kind: string; id: string; error: string }[] = [];
  let ok = 0;
  let pending = 0;
  let totalCents = 0;

  const { data: orders, error } = await db
    .from("store_orders")
    .select("id, monto_capturado, costo_envio, cargo_peso, cargo_servicio, propina, credito_aplicado")
    .is("transferido_en", null)
    .not("capturado_en", "is", null)
    .gt("monto_capturado", 0)
    .order("capturado_en", { ascending: true })
    .limit(MAX_ROWS);
  if (error) {
    await db.from("payout_runs").insert({ source, errors: [{ kind: "db", id: "-", error: error.message }] });
    return { ok: false, error: error.message };
  }

  for (const o of orders ?? []) {
    const res = await transferStoreOrder(o.id, db);
    if (res.ok && !res.skipped) {
      ok++;
      totalCents += storeShareCents(o);
    } else if (res.skipped) pending++;
    else errors.push({ kind: "negocio", id: o.id, error: res.error ?? "error" });
  }

  const { data: payouts } = await db
    .from("driver_payouts")
    .select("id, amount_usd")
    .neq("status", "pagado")
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  for (const p of payouts ?? []) {
    const res = await transferDriverPayout(p.id, db);
    if (res.ok && !res.skipped) {
      ok++;
      totalCents += Math.round(money(p.amount_usd) * 100);
    } else if (res.skipped) pending++;
    else errors.push({ kind: "repartidor", id: p.id, error: res.error ?? "error" });
  }

  const total = totalCents / 100;
  await db.from("payout_runs").insert({
    source,
    transfers_ok: ok,
    total_usd: total,
    pending,
    errors: errors.slice(0, 50),
  });
  return { ok: true, transfers: ok, totalUsd: total, pending, errors: errors.length };
}
