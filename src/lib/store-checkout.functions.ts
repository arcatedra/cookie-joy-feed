/**
 * Checkout del marketplace de tiendas.
 * Crea el pedido de tienda y abre un pago con RESERVA (capture_method: manual).
 * El cobro real ocurre cuando la tienda marca "Listo para recoger"
 * (ver src/lib/store-orders.functions.ts).
 *
 * Totalmente separado del checkout de galletas: otras tablas
 * (store_orders / store_order_items) y otra marca en Stripe (kind = "store_order").
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cartWeightLb,
  isDeliveryDateAllowed,
  pricingFromRows,
  tierForSubtotal,
  weightFeeCents,
} from "./pricing";

interface StripeSession {
  id: string;
  client_secret?: string | null;
  url?: string | null;
}

const addressSchema = z.object({
  name: z.string().min(2).max(120),
  street: z.string().min(2).max(200),
  apt: z.string().max(80).optional().default(""),
  city: z.string().min(1).max(120),
  zip: z.string().min(2).max(20),
  country: z.string().length(2).default("US"),
});

const schema = z.object({
  businessId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(60),
  address: addressSchema,
  /** Día de entrega elegido por el cliente (YYYY-MM-DD). */
  fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Propina voluntaria para el repartidor (USD). */
  propina: z.number().min(0).max(200).optional().default(0),
  /** Usar el saldo disponible del cliente. */
  usarSaldo: z.boolean().optional().default(true),
});

/** Envío fijo del marketplace (no toca las tarifas de galletas). */
export const STORE_DELIVERY_FEE_CENTS = 499;


export const createStoreCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
      claims?: { email?: string };
    };
    const email = ((claims?.email as string | undefined) ?? "").toLowerCase();
    const db = supabase as any;

    // ---- Tienda: debe estar aprobada y activa ---------------------------
    const { data: business, error: bizErr } = await db
      .from("businesses")
      .select("id, business_name, status, activo, comision_porcentaje")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bizErr) throw new Error("No se pudo verificar la tienda.");
    if (!business || business.status !== "aprobado" || business.activo === false) {
      throw new Error("Esta tienda no está disponible en este momento.");
    }

    // ---- Precios de confianza: siempre desde la base ---------------------
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: rows, error: prodErr } = await db
      .from("store_products")
      .select("id, nombre, precio, unidad, disponible, business_id, peso_lb")
      .in("id", ids)
      .eq("business_id", data.businessId);
    if (prodErr) throw new Error("No se pudieron verificar los precios.");

    // ---- Ajustes de precio (cargo de servicio, peso) ----------------------
    const { data: pricingRows } = await db.from("pricing_settings").select("key, value");
    const pricing = pricingFromRows(pricingRows);

    const byId = new Map<string, any>((rows ?? []).map((r: any) => [r.id, r]));
    const priced = data.items.map((it) => {
      const p = byId.get(it.productId);
      if (!p || p.disponible === false || !Number.isFinite(Number(p.precio))) {
        throw new Error("Uno de los productos ya no está disponible.");
      }
      return {
        productId: it.productId,
        name: String(p.nombre),
        unit: String(p.unidad ?? "unidad"),
        priceCents: Math.round(Number(p.precio) * 100),
        pesoLb: Number(p.peso_lb ?? pricing.defaultProductWeightLb),
        qty: it.qty,
      };
    });

    const subtotalCents = priced.reduce((s, it) => s + it.priceCents * it.qty, 0);
    if (subtotalCents <= 0) throw new Error("El pedido está vacío.");

    const totalLb = cartWeightLb(priced, pricing);
    if (totalLb > pricing.weightMaxLb) {
      throw new Error(
        `Máximo ${pricing.weightMaxLb} kg por pedido. Divide tu compra en 2 pedidos.`,
      );
    }
    if (data.fechaEntrega && !isDeliveryDateAllowed(data.fechaEntrega, pricing)) {
      throw new Error("Ese día de entrega ya no está disponible. Elige otro.");
    }
    const tier = tierForSubtotal(subtotalCents, pricing);
    const serviceCents = 0;
    const weightCents = weightFeeCents(totalLb, pricing);
    const shippingCents = tier.feeCents;
    const tipCents = Math.round((data.propina ?? 0) * 100);
    const grossCents = subtotalCents + shippingCents + weightCents + tipCents;

    // ---- Saldo de referidos ------------------------------------------------
    let creditCents = 0;
    if (data.usarSaldo !== false) {
      const { data: bal } = await db.rpc("get_my_credit_balance");
      const available = Math.max(0, Math.round(Number(bal ?? 0) * 100));
      creditCents = Math.min(available, Math.max(grossCents - 100, 0));
    }
    const totalCents = grossCents - creditCents;

    // ---- Margen de reserva (mismo ajuste configurable de siempre) --------
    let bufferPct = 15;
    let bufferMinCents = 500;
    {
      const { data: cfg } = await db.rpc("auth_buffer_settings");
      const row = (Array.isArray(cfg) ? cfg[0] : cfg) as
        | { pct?: number; min_cents?: number }
        | null;
      if (row?.pct != null) bufferPct = Number(row.pct);
      if (row?.min_cents != null) bufferMinCents = Number(row.min_cents);
    }
    const bufferCents = Math.max(Math.round((totalCents * bufferPct) / 100), bufferMinCents);
    const authorizedCents = totalCents + bufferCents;

    const commissionPct = Number(business.comision_porcentaje ?? 15);
    const commissionEstimated = Math.round((subtotalCents * commissionPct) / 100) / 100;

    // ---- Pedido en 'pendiente_pago' --------------------------------------
    const { data: order, error: orderErr } = await db
      .from("store_orders")
      .insert({
        business_id: data.businessId,
        cliente_id: userId,
        estado: "pendiente_pago",
        direccion_envio: data.address,
        subtotal: subtotalCents / 100,
        costo_envio: shippingCents / 100,
        cargo_servicio: serviceCents / 100,
        tramo: tier.tier,
        envio_repartidor: tier.driverCents / 100,
        envio_empresa: tier.companyCents / 100,
        propina: tipCents / 100,
        cargo_peso: weightCents / 100,
        cargo_peso_repartidor: weightCents / 100,
        peso_total_lb: totalLb,
        fecha_entrega: data.fechaEntrega ?? null,
        credito_aplicado: creditCents / 100,
        total_estimado: totalCents / 100,
        comision_porcentaje: commissionPct,
        comision_estimada: commissionEstimated,
        moneda: "USD",
      })
      .select("id, numero_pedido")
      .single();
    if (orderErr || !order) {
      console.error("[store-checkout] no se pudo crear el pedido", orderErr);
      throw new Error("No se pudo crear el pedido. Inténtalo de nuevo.");
    }


    const { error: itemsErr } = await db.from("store_order_items").insert(
      priced.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        nombre_producto: it.name.slice(0, 200),
        unidad: it.unit,
        precio_unitario: it.priceCents / 100,
        cantidad: it.qty,
        subtotal_item: (it.priceCents * it.qty) / 100,
      })),
    );
    if (itemsErr) {
      await db.from("store_orders").delete().eq("id", order.id);
      throw new Error("No se pudo guardar el detalle del pedido.");
    }

    // ---- Pago con reserva -------------------------------------------------
    const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const lineItems: Record<string, unknown>[] = [];
    if (creditCents > 0) {
      // Stripe no admite líneas negativas: se cobra un solo concepto ya con el saldo aplicado.
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: totalCents + bufferCents,
          product_data: {
            name: `Pedido ${order.numero_pedido} (saldo aplicado -$${(creditCents / 100).toFixed(2)})`,
          },
        },
      });
    } else {
      for (const it of priced) {
        lineItems.push({
          quantity: it.qty,
          price_data: {
            currency: "usd",
            unit_amount: it.priceCents,
            product_data: { name: it.name.slice(0, 250) },
          },
        });
      }
      const extras: Array<[string, number]> = [
        [`Entrega (pedido ${tier.tier})`, shippingCents],
        ["Cargo por peso", weightCents],
        ["Propina para el repartidor", tipCents],
        ["Margen para ajustes de peso y faltantes (se cobra solo lo real)", bufferCents],
      ];
      for (const [name, amount] of extras) {
        if (amount > 0) {
          lineItems.push({
            quantity: 1,
            price_data: { currency: "usd", unit_amount: amount, product_data: { name } },
          });
        }
      }
    }


    const metadata = {
      kind: "store_order",
      store_order_id: order.id,
      business_id: data.businessId,
      cliente_id: userId,
    };

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
          payment_intent_data: {
            description: `HAZOREX TIENDA ${order.numero_pedido}`,
            capture_method: "manual",
            metadata,
          },
          metadata,
        },
        env,
      );
    } catch (e) {
      console.error("[store-checkout] stripe error", e);
      await db.from("store_order_items").delete().eq("order_id", order.id);
      await db.from("store_orders").delete().eq("id", order.id);
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("store_orders")
      .update({
        stripe_checkout_session_id: session.id,
        monto_autorizado: authorizedCents / 100,
      })
      .eq("id", order.id);

    // Descuenta el saldo usado (movimiento negativo).
    if (creditCents > 0) {
      await (supabaseAdmin as any).from("wallet_credits").insert({
        user_id: userId,
        amount_usd: -creditCents / 100,
        reason: "uso_en_pedido",
        order_id: order.id,
      });
    }


    return {
      orderId: order.id as string,
      numeroPedido: order.numero_pedido as string,
      clientSecret: session.client_secret ?? null,
      url: session.url ?? null,
      totalEstimado: totalCents / 100,
      creditoAplicado: creditCents / 100,
      cargoServicio: serviceCents / 100,
      costoEnvio: shippingCents / 100,
      tramo: tier.tier,
      propina: tipCents / 100,
      cargoPeso: weightCents / 100,
      pesoTotalLb: totalLb,
      montoReservado: authorizedCents / 100,
    };
  });
