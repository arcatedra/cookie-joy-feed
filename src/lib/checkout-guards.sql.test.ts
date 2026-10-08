import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Real checkout handlers and deployed SQL logic; Stripe is a stub, PostgreSQL is disposable.
const state = vi.hoisted(() => ({ db: null as PGlite | null, stripe: vi.fn(), writes: [] as string[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let parse = (x: unknown) => x;
  const chain = { middleware: () => chain, inputValidator: (fn: typeof parse) => { parse = fn; return chain; },
    handler: (fn: (x: any) => unknown) => (x: any) => fn({ ...x, data: parse(x.data) }) };
  return chain;
} }));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHost: () => "localhost:8080" }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./stripe.server", () => ({ paymentsEnvironmentForHost: () => "sandbox", stripePost: state.stripe }));
vi.mock("./referrals-attach.server", () => ({ attachReferralIfPending: async () => undefined }));
vi.mock("./order-credit.server", () => ({ reserveOrderCredit: async () => 0, releaseOrderCredit: async () => undefined }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: client("service_role") }));

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migration = (name: string) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");
function functionSql(sql: string, name: string) {
  const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`, "i"));
  if (!match) throw new Error(`Missing real SQL: ${name}`);
  return match[0];
}
const address = { name: "PRUEBA Familia", street: "123 Test Street", apt: "1", city: "New York", zip: "10001", phone: "+12125550123", country: "US" };
function client(role: string) {
  return {
    rpc: async () => ({ data: [{ pct: 15, min_cents: 500 }], error: null }),
    from(table: string) {
      let op = "select"; let values: any; const filters: Array<[string, unknown]> = [];
      const query: any = {
        select: () => query, eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        in: () => query, insert: (v: unknown) => { op = "insert"; values = v; return query; },
        update: (v: unknown) => { op = "update"; values = v; return query; },
        maybeSingle: () => run(true), single: () => run(true), then: (yes: any, no: any) => run(false).then(yes, no),
      };
      async function run(single: boolean) {
        if (!state.db) throw new Error("Disposable database not ready");
        if (op === "select") {
          const fixtures: Record<string, unknown[]> = {
            clientes: [{ id: uid(2) }], productos: [{ id: uid(90), nombre: "PRUEBA Galletas", precio: 20, disponible: true }],
            businesses: [{ id: uid(91), business_name: "PRUEBA Tienda", status: "aprobado", activo: true, comision_porcentaje: 15, stripe_environment: "sandbox" }],
            store_products: [{ id: uid(92), nombre: "PRUEBA Producto", precio: 20, disponible: true, unidad: "unidad", peso_lb: 1 }],
            pricing_settings: [], delivery_zones: [],
          };
          return { data: single ? fixtures[table]?.[0] : fixtures[table], error: null };
        }
        state.writes.push(`${role}:${table}:${op}`);
        await state.db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.role','${role}',false);`);
        try {
          let rows: unknown[] = [];
          for (const row of Array.isArray(values) ? values : [values]) {
            const keys = Object.keys(row); const params = Object.values(row);
            const sql = op === "insert"
              ? `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`
              : `UPDATE ${table} SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE ${filters.map(([k], i) => `${k}=$${keys.length + i + 1}`).join(" AND ")} RETURNING *`;
            rows = (await state.db.query(sql, [...params.map(v => typeof v === "object" && v !== null ? JSON.stringify(v) : v), ...filters.map(([, v]) => v)])).rows;
          }
          return { data: single ? rows[0] : rows, error: null };
        } catch (error) { return { data: null, error }; }
        finally { await state.db.exec("RESET ROLE"); }
      }
      return query;
    },
  };
}

describe("bloqueos de checkout y referidos en PostgreSQL aislado", () => {
  beforeAll(async () => {
    state.db = new PGlite();
    await state.db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TYPE public.app_role AS ENUM ('admin','user');
      CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      CREATE TABLE profiles(id uuid PRIMARY KEY,name text,region text,terms_accepted boolean,terms_accepted_at timestamptz,referral_code text UNIQUE,referred_by uuid);
      CREATE TABLE clientes(id uuid PRIMARY KEY,telefono text,referred_by_profile_id uuid);
      CREATE TABLE referrals(referrer_id uuid,referee_id uuid UNIQUE);
      CREATE TABLE pedidos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),numero_pedido text DEFAULT 'PRUEBA',cliente_id uuid,
        estado text DEFAULT 'pendiente',subtotal numeric,total numeric,costo_envio numeric,impuestos numeric,moneda text,direccion_envio jsonb,metodo_pago text,flujo_pago text,
        propina numeric DEFAULT 0,credito_aplicado numeric DEFAULT 0,monto_capturado numeric DEFAULT 0,monto_autorizado numeric,
        stripe_environment text,stripe_payment_intent_id text,stripe_checkout_session_id text,capturado_en timestamptz);
      CREATE TABLE store_orders(LIKE pedidos INCLUDING ALL);
      ALTER TABLE store_orders ADD business_id uuid,ADD cargo_servicio numeric,ADD tramo text,ADD envio_repartidor numeric,ADD envio_empresa numeric,
        ADD cargo_peso numeric,ADD cargo_peso_repartidor numeric,ADD peso_total_lb numeric,ADD fecha_entrega date,ADD total_estimado numeric,ADD comision_porcentaje numeric,ADD comision_estimada numeric;
      CREATE TABLE pedido_items(pedido_id uuid,producto_id uuid,nombre_producto text,precio_unitario numeric,cantidad numeric,subtotal_item numeric,substitution_mode text,substitute_ids jsonb,status text);
      CREATE TABLE store_order_items(order_id uuid,product_id uuid,nombre_producto text,unidad text,precio_unitario numeric,cantidad numeric,subtotal_item numeric);
      CREATE TABLE referral_rewards(id uuid DEFAULT gen_random_uuid(),referrer_id uuid,referee_id uuid,status text,block_reason text,order_id uuid,amount_usd numeric,order_kind text,stripe_environment text,UNIQUE(referee_id,stripe_environment));
      CREATE TABLE wallet_credits(user_id uuid,amount_usd numeric,reason text,order_id uuid,order_kind text,stripe_environment text,operation_key text UNIQUE);
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
      GRANT SELECT,INSERT,UPDATE ON pedidos,store_orders,profiles TO authenticated;
      GRANT INSERT ON pedido_items,store_order_items TO authenticated;
      CREATE TABLE fake_signup(id uuid,raw_user_meta_data jsonb);
      CREATE FUNCTION generate_referral_code() RETURNS text LANGUAGE sql AS $$ SELECT gen_random_uuid()::text $$;
    `);
    const guards = migration("20261008164510_444b3156-ddae-411c-9353-4de16055d5b1.sql");
    for (const name of ["protect_cookie_money", "protect_referrer_link", "grant_captured_referral"]) await state.db.exec(functionSql(guards, name));
    await state.db.exec(migration("20261008165355_d54d7eed-6c58-4ee2-ab61-5b5c8ea72f3d.sql"));
    await state.db.exec(migration("20260923052734_1ce6862f-e43e-469f-af0b-2ea7de8ba546.sql").split("CREATE TABLE IF NOT EXISTS public.account_fingerprints")[1] ? "CREATE TABLE IF NOT EXISTS public.account_fingerprints" + migration("20260923052734_1ce6862f-e43e-469f-af0b-2ea7de8ba546.sql").split("CREATE TABLE IF NOT EXISTS public.account_fingerprints")[1] : "");
    await state.db.exec(functionSql(migration("20260726054259_7838b067-fd20-4560-b3ca-19208a428e8f.sql"), "handle_new_user_profile"));
    await state.db.exec(`
      CREATE TRIGGER protect_cookie BEFORE INSERT OR UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION protect_cookie_money();
      CREATE TRIGGER protect_referrer BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_referrer_link();
      CREATE TRIGGER signup AFTER INSERT ON fake_signup FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();
      INSERT INTO profiles(id,referral_code) VALUES ('${uid(1)}','PRUEBACODE');
      INSERT INTO clientes(id,telefono) VALUES ('${uid(2)}','2125550123'),('${uid(3)}','2125550124');
      INSERT INTO fake_signup VALUES ('${uid(2)}','{"name":"PRUEBA Invitado","referral_code":"pruebacode","terms_accepted":true}'),('${uid(3)}','{"name":"PRUEBA Familia","referral_code":"PRUEBACODE"}');
    `);
  }, 30000);
  afterAll(async () => { await state.db?.close(); });

  it("el registro conserva el código de invitación con protect_referrer_link activo", async () => {
    expect((await state.db?.query("SELECT referred_by FROM profiles WHERE id=$1", [uid(2)]))?.rows).toEqual([{ referred_by: uid(1) }]);
    expect((await state.db?.query("SELECT referrer_id FROM referrals WHERE referee_id=$1", [uid(2)]))?.rows).toEqual([{ referrer_id: uid(1) }]);
    await state.db?.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.role','authenticated',false)");
    await expect(state.db?.query("UPDATE profiles SET referred_by=NULL WHERE id=$1", [uid(2)])).rejects.toThrow("no puede cambiarse");
    await expect(state.db?.query("UPDATE profiles SET name='PRUEBA Nombre' WHERE id=$1", [uid(2)])).resolves.toBeDefined();
    await state.db?.exec("RESET ROLE");
  });
  it("rechaza importes manipulados por el cliente, no el pedido legítimo", async () => {
    await state.db?.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.role','authenticated',false)");
    await expect(state.db?.query("INSERT INTO pedidos(cliente_id,propina) VALUES ($1,5)", [uid(2)])).rejects.toThrow("solo los crea el sistema");
    await expect(state.db?.query("INSERT INTO pedidos(cliente_id) VALUES ($1)", [uid(2)])).resolves.toBeDefined();
    await state.db?.exec("RESET ROLE");
  });
  for (const kind of ["cookie", "store"] as const) {
    it(`${kind}: handler real crea pedido con propina y abre la sesión de pago simulada sin bloqueo`, async () => {
      state.stripe.mockResolvedValue({ id: `cs_test_${kind}`, client_secret: "PRUEBA_secret" });
      state.writes.length = 0;
      const { createCartCheckout } = await import("./cart-checkout.functions");
      const { createStoreCheckout } = await import("./store-checkout.functions");
      const handler: any = kind === "cookie" ? createCartCheckout : createStoreCheckout;
      const result = await handler({ data: { address, propina: 3, usarSaldo: false,
        ...(kind === "cookie" ? { items: [{ id: uid(90), name: "PRUEBA", price: 0.01, qty: 1 }] : { businessId: uid(91), items: [{ productId: uid(92), qty: 1 }] }) },
        context: { supabase: client("authenticated"), userId: uid(2), claims: { email: "prueba@example.com" } } });
      expect(result.clientSecret).toBe("PRUEBA_secret");
      const table = kind === "cookie" ? "pedidos" : "store_orders";
      expect(state.writes).toContain(`service_role:${table}:insert`);
      expect(state.writes).not.toContain(`authenticated:${table}:insert`);
      const id = result.pedidoId ?? result.orderId;
      const row = (await state.db?.query(`SELECT propina,subtotal,stripe_checkout_session_id FROM ${table} WHERE id=$1`, [id]))?.rows[0];
      expect(row).toMatchObject({ propina: "3", subtotal: "20", stripe_checkout_session_id: `cs_test_${kind}` });
      expect(state.stripe).toHaveBeenLastCalledWith("/v1/checkout/sessions", expect.objectContaining({ payment_intent_data: expect.objectContaining({ capture_method: "manual" }) }), "sandbox");
    });
  }
  it("dos familiares compran y se cobra a ambos; la dirección compartida bloquea únicamente el segundo bono", async () => {
    await state.db?.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
    for (const [n, table] of [[2, "pedidos"], [3, "store_orders"]] as const) {
      const inserted = await state.db?.query<{ id: string }>(`INSERT INTO ${table}(cliente_id,subtotal,direccion_envio,stripe_environment) VALUES ($1,20,$2,'sandbox') RETURNING id`, [uid(n), JSON.stringify(address)]);
      const id = inserted?.rows[0]?.id;
      expect(id).toBeTruthy();
      const kind = table === "pedidos" ? "cookie" : "store";
      expect((await state.db?.query("SELECT grant_captured_referral($1,$2,'sandbox') AS rewarded", [kind, id]))?.rows).toEqual([{ rewarded: false }]);
      await state.db?.query(`UPDATE ${table} SET monto_capturado=23,capturado_en=now(),estado='pagado' WHERE id=$1`, [id]);
      expect((await state.db?.query("SELECT grant_captured_referral($1,$2,'sandbox') AS rewarded", [kind, id]))?.rows).toEqual([{ rewarded: n === 2 }]);
      expect((await state.db?.query(`SELECT estado,monto_capturado FROM ${table} WHERE id=$1`, [id]))?.rows).toEqual([{ estado: "pagado", monto_capturado: "23" }]);
      expect((await state.db?.query("SELECT grant_captured_referral($1,$2,'sandbox') AS rewarded", [kind, id]))?.rows).toEqual([{ rewarded: false }]);
    }
    expect((await state.db?.query("SELECT status,block_reason,amount_usd FROM referral_rewards WHERE referee_id=$1", [uid(3)]))?.rows).toEqual([{ status: "bloqueado", block_reason: "duplicado_direccion", amount_usd: "0" }]);
    expect((await state.db?.query("SELECT SUM(amount_usd)::text AS balance FROM wallet_credits WHERE user_id=$1", [uid(1)]))?.rows).toEqual([{ balance: "5" }]);
  });
  it("los fingerprints privados no son visibles ni editables por un comprador", async () => {
    await state.db?.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.role','authenticated',false)");
    expect((await state.db?.query("SELECT * FROM account_fingerprints"))?.rows).toEqual([]);
    await expect(state.db?.query("INSERT INTO account_fingerprints(user_id,kind,value_norm) VALUES ($1,'direccion','manipulado')", [uid(2)])).rejects.toThrow("permission denied");
    await state.db?.exec("RESET ROLE");
  });
});