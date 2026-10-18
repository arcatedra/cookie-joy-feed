import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ items: [] as any[], products: [] as any[], failSave: false, capture: vi.fn(), writes: [] as any[] }));
const orderId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (x: any) => x;
  const chain = { middleware: () => chain, inputValidator: (fn: any) => { parse = fn; return chain; }, handler: (fn: any) => (args: any) => fn({ ...args, data: parse(args.data) }) };
  return chain;
} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHost: () => "localhost:8080" }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./stripe.server", () => ({ paymentsEnvironmentForHost: () => "sandbox", stripeCapturePaymentIntent: state.capture }));
vi.mock("./payouts.server", () => ({ environmentForStoreOrder: async () => "sandbox", adminDb: () => db, flushBusinessPending: async () => {} }));
vi.mock("./referral-rewards.server", () => ({ grantReferralRewardForOrder: async () => {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (t: string) => db.from(t), rpc: async () => ({ data: 0, error: null }) } }));

const db = {
  from(table: string) {
    let patch: any;
    let id: string | undefined;
    const query: any = {
      select: () => query, in: () => query, eq: (key: string, value: string) => { if (key === "id") id = value; return query; },
      update: (value: any) => { patch = value; return query; },
      maybeSingle: async () => ({ data: table === "businesses" ? { id: "business" } : {
        id: orderId, business_id: "business", estado: "preparando", stripe_payment_intent_id: "pi_simulated", monto_autorizado: 100, propina: 0,
      }, error: null }),
      then: (yes: any, no: any) => Promise.resolve().then(() => {
        if (patch) {
          if (table === "store_order_items" && state.failSave) return { data: null, error: new Error("simulated save failure") };
          state.writes.push({ table, patch });
          if (table === "store_order_items") state.items = state.items.map(it => it.id === id ? { ...it, ...patch } : it);
          return { data: [{ id }], error: null };
        }
        return { data: table === "store_order_items" ? state.items : table === "store_products" ? state.products : [], error: null };
      }).then(yes, no),
    };
    return query;
  },
};
import { markOrderReadyAndCapture } from "./store-orders.functions";
const call = (items: { itemId: string; cantidadReal: number }[]) => markOrderReadyAndCapture({ data: { id: orderId, items }, context: { supabase: db, userId: "merchant" } } as any);

describe("cobro real con Stripe simulado", () => {
  beforeEach(() => {
    state.capture.mockReset(); state.failSave = false; state.writes = [];
    state.items = [{ id: itemId, product_id: "product", cantidad: 3, cantidad_real: null, pick_status: "encontrado", precio_unitario: 5 }];
    state.products = [{ id: "product", vendido_por_lb: false, peso_lb: 1 }];
  });
  it("la pantalla de tienda guarda 2 y calcula $10 en productos, no $15", async () => {
    await call([{ itemId, cantidadReal: 2 }]);
    expect(state.items[0].cantidad_real).toBe(2);
    expect(state.writes.find(w => w.table === "store_orders").patch.subtotal).toBe(10);
    expect(state.capture).toHaveBeenCalledTimes(1);
  });
  it("la pantalla de escaneo y los reintentos usan las 2 unidades guardadas", async () => {
    state.items[0].cantidad_real = 2;
    await call([]);
    expect(state.writes.find(w => w.table === "store_orders").patch.subtotal).toBe(10);
  });
  it("un guardado fallido impide iniciar Stripe", async () => {
    state.failSave = true;
    await expect(call([{ itemId, cantidadReal: 2 }])).rejects.toThrow(/guardar/);
    expect(state.capture).not.toHaveBeenCalled();
  });
  it("un artículo pendiente impide guardar y cobrar", async () => {
    state.items[0].pick_status = "pendiente";
    await expect(call([{ itemId, cantidadReal: 2 }])).rejects.toThrow(/Faltan/);
    expect(state.writes).toEqual([]);
    expect(state.capture).not.toHaveBeenCalled();
  });
  it("valida todo antes de guardar: una cantidad superior no llama a Stripe", async () => {
    await expect(call([{ itemId, cantidadReal: 4 }])).rejects.toThrow(/Cantidad/);
    expect(state.writes).toEqual([]);
    expect(state.capture).not.toHaveBeenCalled();
  });
});