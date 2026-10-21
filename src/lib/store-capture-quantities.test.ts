import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ items: [] as any[], products: [] as any[], failSave: false, version: null as number | null, capture: vi.fn(), cancel: vi.fn(), writes: [] as any[] }));
const orderId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (x: any) => x;
  const chain = { middleware: () => chain, inputValidator: (fn: any) => { parse = fn; return chain; }, handler: (fn: any) => (args: any) => fn({ ...args, data: parse(args.data) }) };
  return chain;
} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHost: () => "localhost:8080" }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./stripe.server", () => ({ paymentsEnvironmentForHost: () => "sandbox", stripeCapturePaymentIntent: state.capture, stripeCancelPaymentIntent: state.cancel }));
vi.mock("./order-credit.server", () => ({ releaseOrderCredit: async () => undefined }));
vi.mock("./payouts.server", () => ({ environmentForStoreOrder: async () => "sandbox", adminDb: () => db, flushBusinessPending: async () => {} }));
vi.mock("./referral-rewards.server", () => ({ grantReferralRewardForOrder: async () => {} }));
vi.mock("./barcode.server", () => ({ findBarcodeOwner: async () => ({ id: "replacement", nombre: "PRUEBA Reemplazo" }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: (t: string) => db.from(t), rpc: async () => ({ data: 0, error: null }) } }));

const db = {
  rpc: async () => ({ data: false, error: null }),
  from(table: string) {
    let patch: any;
    let id: string | undefined;
    const query: any = {
      select: () => query, in: () => query, eq: (key: string, value: string) => { if (key === "id") id = value; return query; },
      update: (value: any) => { patch = value; return query; },
      maybeSingle: async () => ({ data: table === "businesses" ? { id: "business", owner_user_id: "merchant" } : table === "store_order_items" ? state.items.find(it => it.id === id) : table === "store_products" ? state.products.find(p => p.id === id) : {
        id: orderId, business_id: "business", estado: "preparando", reemplazo: "similar", stripe_payment_intent_id: "pi_simulated", monto_autorizado: 100, propina: 0,
        procesamiento_version: state.version,
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
import { pickReplaceItem, pickWeighItem, pickSetQuantity } from "./picking.functions";
const call = (items: { itemId: string; cantidadReal: number }[]) => markOrderReadyAndCapture({ data: { id: orderId, items }, context: { supabase: db, userId: "merchant" } } as any);

describe("cobro real con Stripe simulado", () => {
  beforeEach(() => {
    state.capture.mockReset(); state.cancel.mockReset(); state.version = null; state.failSave = false; state.writes = [];
    state.items = [{ id: itemId, product_id: "product", cantidad: 3, cantidad_real: null, pick_status: "encontrado", precio_unitario: 5 }];
    state.products = [{ id: "product", vendido_por_lb: false, peso_lb: 1 }];
  });
  it("la pantalla de tienda guarda 2 y calcula $10 en productos, no $15", async () => {
    await call([{ itemId, cantidadReal: 2 }]);
    expect(state.items[0].cantidad_real).toBe(2);
    expect(state.writes.find(w => w.table === "store_orders").patch.subtotal).toBe(10);
    expect(state.capture).toHaveBeenCalledTimes(1);
  });
  it("nuevo pedido recalcula cargo al faltar una unidad sin cambiar precio ni entrega", async () => {
    state.version = 1;
    await call([{ itemId, cantidadReal: 2 }]);
    expect(state.capture.mock.calls[0][1]).toBe(2297);
    const saved = state.writes.find(w => w.table === "store_orders").patch;
    expect(saved).toMatchObject({ subtotal: 10, costo_envio: 12, cargo_procesamiento: .97, total_estimado: 22.97 });
  });
  it("especial no encontrado libera reserva completa sin capturar ni cargo", async () => {
    state.version = 1;
    state.items = [{ ...state.items[0], especial: true, product_id: null, pick_status: "no_habia", cantidad_real: 0 }];
    await call([]);
    expect(state.capture).not.toHaveBeenCalled();
    expect(state.cancel).toHaveBeenCalledTimes(1);
    expect(state.writes.find(w => w.table === "store_orders").patch).toMatchObject({ estado: "cancelado", cargo_procesamiento: 0, monto_capturado: 0 });
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
  const context = { supabase: db, userId: "merchant" };
  async function replaceAndCapture(originalWeighted: boolean, replacementWeighted: boolean) {
    state.items[0] = { ...state.items[0], order_id: orderId, picked_weight_lb: 99 };
    state.products = [
      { id: "product", vendido_por_lb: originalWeighted, peso_lb: 10, codigos_barras: ["123456789012"] },
      { id: "replacement", vendido_por_lb: replacementWeighted, peso_lb: 2 },
    ];
    await pickReplaceItem({ data: { itemId, code: "987654321098" }, context } as any);
    expect(state.items[0].picked_weight_lb).toBeNull();
    if (replacementWeighted) {
      await expect(call([])).rejects.toThrow(/peso real/);
      expect(state.capture).not.toHaveBeenCalled();
      await pickWeighItem({ data: { itemId, weightLb: 3 }, context } as any);
      expect(state.items[0].replacement_product_id).toBe("replacement");
      expect(state.items[0].pick_status).toBe("reemplazado");
    } else {
      await pickSetQuantity({ data: { itemId, quantity: 2 }, context } as any);
    }
    await call([]);
    const saved = state.writes.find(w => w.table === "store_orders").patch;
    expect(saved.subtotal).toBe(replacementWeighted ? 7.5 : 10);
    expect(saved.peso_total_lb).toBe(replacementWeighted ? 3 : 4);
    expect(state.capture).toHaveBeenCalledTimes(1);
    expect(state.capture.mock.calls[0][1]).toBe(replacementWeighted ? 1950 : 2200);
    expect(state.capture.mock.calls[0][3]).toBe("sandbox");
  }
  it("libra a libra conserva precio original y cobra con peso real del reemplazo", () => replaceAndCapture(true, true));
  it("unidad a libra exige peso real y permite cobrar", () => replaceAndCapture(false, true));
  it("libra a unidad usa cantidad real sin exigir el peso del original", () => replaceAndCapture(true, false));
  it("unidad a unidad conserva cantidad real y precio original", () => replaceAndCapture(false, false));
  it("un reemplazo sin ficha válida no guarda cantidades ni llama a Stripe", async () => {
    state.items[0] = { ...state.items[0], pick_status: "reemplazado", replacement_product_id: "missing" };
    await expect(call([])).rejects.toThrow(/reemplazo/);
    expect(state.writes).toEqual([]);
    expect(state.capture).not.toHaveBeenCalled();
  });
  it("un peso inválido del reemplazo se rechaza antes de guardar", async () => {
    state.items[0] = { ...state.items[0], pick_status: "reemplazado", replacement_product_id: "replacement" };
    state.products.push({ id: "replacement", vendido_por_lb: true, peso_lb: 2 });
    await expect(async () => pickWeighItem({ data: { itemId, weightLb: 0 }, context } as any)).rejects.toThrow();
    expect(state.writes).toEqual([]);
    expect(state.capture).not.toHaveBeenCalled();
  });
});