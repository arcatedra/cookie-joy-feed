import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface StripeSession {
  id: string;
  client_secret?: string | null;
  url?: string | null;
}

const itemSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  price: z.number().positive().max(10000),
  qty: z.number().int().min(1).max(99),
  image: z.string().max(2000).optional(),
  substitutionMode: z.enum(["best_match", "specific", "refund"]).default("best_match"),
  substituteIds: z.array(z.string().uuid()).max(3).default([]),
});

const addressSchema = z.object({
  name: z.string().min(2).max(120),
  street: z.string().min(2).max(200),
  apt: z.string().max(80).optional().default(""),
  city: z.string().min(1).max(120),
  zip: z.string().min(2).max(20),
  phone: z.string().min(4).max(40),
  country: z.string().length(2).default("US"),
});

const schema = z.object({
  items: z.array(itemSchema).min(1).max(40),
  address: addressSchema,
  shipping: z.enum(["standard", "express"]).default("standard"),
  propina: z.number().finite().min(0).max(200).default(0),
  usarSaldo: z.boolean().default(true),
  locale: z.enum(["es", "en"]).default("es"),
});

const SHIPPING_RATES = {
  standard: { label: "Envío estándar", amount: 0 },
  express: { label: "Envío exprés", amount: 499 },
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
      claims?: { email?: string };
    };
    const email = ((claims?.email as string | undefined) ?? "").toLowerCase();

    // Existing customers are read only; never auto-create or overwrite customer data here.
    const { data: customer } = await supabase.from("clientes").select("id").eq("id", userId).maybeSingle();
    if (!customer) throw new Error("Tu cuenta todavía no está lista para comprar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reserveOrderCredit, releaseOrderCredit } = await import("./order-credit.server");
    const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
    const { resolveStaticPrice } = await import("./catalog-prices.server");
    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const { attachReferralIfPending } = await import("./referrals-attach.server");
    await attachReferralIfPending({ supabase: supabase, userId });

    // ---- Trusted pricing -------------------------------------------------
    // Never charge the price sent by the browser. Real products are priced from
    // the `productos` table; static catalog items from a server-side allowlist.
    const productIds = [...new Set(data.items.filter((it) => UUID_RE.test(it.id)).map((it) => it.id))];
    const productMap = new Map<string, { precio: number; nombre: string }>();
    if (productIds.length > 0) {
      const { data: rows, error: prodErr } = await supabase
        .from("productos")
        .select("id, nombre, precio, disponible")
        .in("id", productIds);
      if (prodErr) {
        console.error("[cart-checkout] failed to load productos", prodErr);
        throw new Error("No se pudieron verificar los precios. Inténtalo de nuevo.");
      }
      for (const r of rows ?? []) {
        if (r.disponible === false) continue;
        productMap.set(r.id as string, { precio: Number(r.precio), nombre: String(r.nombre) });
      }
    }

    const pricedItems = data.items.map((it) => {
      if (UUID_RE.test(it.id)) {
        const p = productMap.get(it.id);
        if (!p || !Number.isFinite(p.precio) || p.precio <= 0) {
          throw new Error("Uno de los productos de tu carrito ya no está disponible.");
        }
        return {
        id: it.id,
        name: p.nombre,
        price: p.precio,
        qty: it.qty,
        image: it.image,
        substitutionMode: it.substitutionMode,
        substituteIds: it.substituteIds,
      };
      }
      const price = resolveStaticPrice(it.id, it.price);
      if (price === null) {
        throw new Error("Uno de los productos de tu carrito ya no está disponible.");
      }
      return {
        id: it.id,
        name: it.name,
        price,
        qty: it.qty,
        image: it.image,
        substitutionMode: it.substitutionMode,
        substituteIds: it.substituteIds,
      };
    });

    const shippingRate = SHIPPING_RATES[data.shipping];
    const subtotalCents = pricedItems.reduce(
      (s, it) => s + Math.round(it.price * 100) * it.qty,
      0,
    );
    const tipCents = Math.round(data.propina * 100);
    const grossCents = subtotalCents + shippingRate.amount + tipCents;
    let creditCents = 0;
    let totalCents = grossCents;

    // ---- Margen de autorización -----------------------------------------
    // Se reserva (autoriza) el estimado + un margen, y al terminar el empaque
    // se captura solo el monto real. Ver /admin/empaque.
    let bufferPct = 15;
    let bufferMinCents = 500;
    {
      const { data: cfg } = await supabase.rpc("auth_buffer_settings" as never);
      const row = (Array.isArray(cfg) ? cfg[0] : cfg) as
        | { pct?: number; min_cents?: number }
        | null
        | undefined;
      if (row?.pct != null) bufferPct = Number(row.pct);
      if (row?.min_cents != null) bufferMinCents = Number(row.min_cents);
    }
    let bufferCents = Math.max(
      Math.round((subtotalCents * bufferPct) / 100),
      bufferMinCents,
    );
    let authorizedCents = totalCents + bufferCents;



    // Insert the pedido row in "pendiente" state under RLS (auth.uid() = cliente_id).
    const { data: pedidoRow, error: pedErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        cliente_id: userId,
        stripe_environment: env,
        propina: tipCents / 100,
        estado: "pendiente",
        subtotal: subtotalCents / 100,
        costo_envio: shippingRate.amount / 100,
        impuestos: 0,
        total: totalCents / 100,
        moneda: "USD",
        direccion_envio: data.address,
        metodo_pago: "stripe",
        flujo_pago: "autorizacion_diferida",
        monto_autorizado: authorizedCents / 100,
      })
      .select("id, numero_pedido")
      .single();
    if (pedErr || !pedidoRow) {
      console.error("[cart-checkout] failed to create pedido", pedErr);
      throw new Error("No se pudo crear el pedido. Inténtalo de nuevo.");
    }

    if (data.usarSaldo) creditCents = await reserveOrderCredit(supabaseAdmin, "cookie", pedidoRow.id, Math.max(grossCents - 100, 0), env);
    totalCents = grossCents - creditCents;
    bufferCents = Math.max(Math.round((totalCents * bufferPct) / 100), bufferMinCents);
    authorizedCents = totalCents + bufferCents;
    const { error: totalsError } = await supabaseAdmin.from("pedidos").update({ credito_aplicado: creditCents / 100, total: totalCents / 100, monto_autorizado: authorizedCents / 100 }).eq("id", pedidoRow.id);
    if (totalsError) {
      await supabaseAdmin.from("pedidos").update({ estado: "cancelado" }).eq("id", pedidoRow.id);
      await releaseOrderCredit(supabaseAdmin, "cookie", pedidoRow.id);
      throw new Error("No se pudo guardar el saldo aplicado.");
    }
    // Snapshot each item's name and price at purchase time.
    const itemsInsert = pricedItems.map((it) => ({
      pedido_id: pedidoRow.id,
      producto_id: UUID_RE.test(it.id) ? it.id : null,
      nombre_producto: it.name.slice(0, 200),
      precio_unitario: it.price,
      cantidad: it.qty,
      subtotal_item: Math.round(it.price * 100 * it.qty) / 100,
      substitution_mode: it.substitutionMode ?? "best_match",
      substitute_ids: it.substituteIds ?? [],
      status: "pendiente",
    }));
    const { error: itemsErr } = await supabase.from("pedido_items").insert(itemsInsert);
    if (itemsErr) {
      console.error("[cart-checkout] failed to insert pedido_items", itemsErr);
      await supabaseAdmin.from("pedidos").update({ estado: "cancelado" }).eq("id", pedidoRow.id);
      await releaseOrderCredit(supabaseAdmin, "cookie", pedidoRow.id);
      throw new Error("No se pudo guardar el detalle del pedido. Inténtalo de nuevo.");
    }

    const lineItems: Record<string, unknown>[] = pricedItems.map((it) => ({

      quantity: it.qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(it.price * 100),
        product_data: {
          name: it.name.slice(0, 250),
          ...(it.image && /^https?:\/\//.test(it.image) && { images: [it.image] }),
        },
      },
    }));

    if (creditCents > 0) {
      lineItems.splice(0, lineItems.length, {
        quantity: 1,
        price_data: { currency: "usd", unit_amount: totalCents + bufferCents, product_data: { name: `HAZOREX ${pedidoRow.numero_pedido} (${data.locale === "en" ? "credit applied" : "saldo aplicado"}: -$${(creditCents / 100).toFixed(2)})` } },
      });
    } else {
      for (const [name, cents] of [
        [data.locale === "en" ? "Delivery" : "Entrega", shippingRate.amount],
        [data.locale === "en" ? "Driver tip (100%)" : "Propina para el repartidor (100%)", tipCents],
        [data.locale === "en" ? "Adjustment hold (only the actual amount is charged)" : "Margen para ajustes (se cobra solo lo real)", bufferCents],
      ] as Array<[string, number]>) {
        if (cents > 0) lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: cents, product_data: { name } } });
      }
    }

    let session: StripeSession;
    try {
      session = await stripePost<StripeSession>(
        "/v1/checkout/sessions",
        {
          mode: "payment",
          ui_mode: "embedded",
          return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          customer_email: email || undefined,
          line_items: lineItems,
          locale: data.locale,
          custom_text: { after_submit: { message: data.locale === "en" ? "Order the day before, get it in 24 hours: Monday, Wednesday and Friday" : "Pide el día antes y recibe en 24 horas: lunes, miércoles y viernes" } },
          payment_intent_data: {
            description: `HAZOREX ${pedidoRow.numero_pedido}`,
            // Reserva el dinero; el cobro real ocurre al terminar el empaque.
            capture_method: "manual",
            metadata: {
              kind: "cookie_order",
              pedido_id: pedidoRow.id,
              cliente_id: userId,
            },
          },
          metadata: {
            kind: "cookie_order",
            pedido_id: pedidoRow.id,
            cliente_id: userId,
          },
        },
        env,
      );
    } catch (e) {
      console.error("[cart-checkout] stripe error", e);

      await supabaseAdmin.from("pedidos").update({ estado: "cancelado" }).eq("id", pedidoRow.id);
      await releaseOrderCredit(supabaseAdmin, "cookie", pedidoRow.id);
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    // Persist the Stripe session id on the pedido for the webhook lookup.
    const { error: sessionSaveError } = await supabaseAdmin
      .from("pedidos")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", pedidoRow.id);

    if (sessionSaveError || !session.client_secret) {
      await stripePost(`/v1/checkout/sessions/${session.id}/expire`, {}, env, { "Idempotency-Key": `expire-cookie-${pedidoRow.id}` });
      await supabaseAdmin.from("pedidos").update({ estado: "cancelado" }).eq("id", pedidoRow.id);
      await releaseOrderCredit(supabaseAdmin, "cookie", pedidoRow.id);
      throw new Error("No se pudo abrir el pago. Tu carrito se conserva.");
    }
    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      pedidoId: pedidoRow.id,
      numeroPedido: pedidoRow.numero_pedido,
      creditoAplicado: creditCents / 100,
      totalEstimado: totalCents / 100,
    };
  });

const getOrderSchema = z.object({ sessionId: z.string().min(8).max(200) });

export const getOrderBySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const { data: pedido } = await supabase
      .from("pedidos")
      .select(
        "id, numero_pedido, estado, subtotal, costo_envio, impuestos, total, moneda, creado_en, stripe_checkout_session_id, cliente_id",
      )
      .eq("stripe_checkout_session_id", data.sessionId)
      .eq("cliente_id", userId)
      .maybeSingle();
    if (!pedido) return { found: false as const };
    return {
      found: true as const,
      order: {
        id: pedido.id,
        numeroPedido: pedido.numero_pedido,
        status: pedido.estado,
        subtotal: Number(pedido.subtotal),
        shipping: Number(pedido.costo_envio),
        tax: Number(pedido.impuestos),
        total: Number(pedido.total),
        currency: pedido.moneda,
        createdAt: pedido.creado_en,
      },
    };
  });
