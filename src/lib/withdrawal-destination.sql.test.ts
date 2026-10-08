import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Run the actual migration in disposable PostgreSQL, never on the connected database.
describe("retiro con destino: regresión SQL", () => {
  it("inserta destino y solicitud juntos, aparta una vez y bloquea cambiar o borrar el destino", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
        CREATE TABLE public.withdrawal_requests (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL,
          amount_usd numeric NOT NULL, status text NOT NULL, source text NOT NULL, stripe_environment text NOT NULL);
        CREATE TABLE public.wallet_credits (
          user_id uuid NOT NULL, amount_usd numeric NOT NULL, reason text,
          stripe_environment text NOT NULL, operation_key text UNIQUE);
        INSERT INTO public.wallet_credits VALUES ('00000000-0000-4000-8000-000000000001',10,'PRUEBA','sandbox',NULL);
      `);
      await db.exec(readFileSync(new URL("../../supabase/migrations/20261008170916_70d04983-5666-4a64-925a-34f1126a2c80.sql", import.meta.url), "utf8"));
      const created = await db.query<{ id: string }>(`SELECT public.request_wallet_withdrawal_to_destination($1::uuid,5,'sandbox','zelle','prueba@example.com') AS id`, ["00000000-0000-4000-8000-000000000001"]);
      const id = created.rows[0]?.id;
      expect(id).toBeTruthy();
      const row = await db.query(`SELECT payout_method,payout_identifier FROM public.withdrawal_requests WHERE id=$1`, [id]);
      expect(row.rows).toEqual([{ payout_method: "zelle", payout_identifier: "prueba@example.com" }]);
      const balance = async () => (await db.query<{ balance: string }>("SELECT SUM(amount_usd)::text AS balance FROM public.wallet_credits")).rows[0]?.balance;
      expect(await balance()).toBe("5");
      await expect(db.query("UPDATE public.withdrawal_requests SET payout_identifier='otro@example.com' WHERE id=$1", [id])).rejects.toThrow("no puede cambiarse");
      await expect(db.query("UPDATE public.withdrawal_requests SET payout_method=NULL,payout_identifier=NULL WHERE id=$1", [id])).rejects.toThrow("no puede cambiarse");
      await db.query("UPDATE public.withdrawal_requests SET status='paid_out' WHERE id=$1", [id]);
      await expect(db.query(`SELECT public.request_wallet_withdrawal_to_destination($1::uuid,6,'sandbox','cash_app','$Prueba')`, ["00000000-0000-4000-8000-000000000001"])).rejects.toThrow("Saldo insuficiente");
      await expect(db.query(`SELECT public.request_wallet_withdrawal_to_destination($1::uuid,1,'sandbox','zelle','123456789')`, ["00000000-0000-4000-8000-000000000001"])).rejects.toThrow("Destino de retiro inválido");
      expect(await balance()).toBe("5");
      const second = await db.query(`SELECT public.request_wallet_withdrawal_to_destination($1::uuid,5,'sandbox','cash_app','$PruebaHazorex')`, ["00000000-0000-4000-8000-000000000001"]);
      expect(second.rows).toHaveLength(1);
      expect(await balance()).toBe("0");
      const access = await db.query(`SELECT has_function_privilege('anon','public.request_wallet_withdrawal_to_destination(uuid,numeric,text,text,text)','EXECUTE') AS anon, has_function_privilege('authenticated','public.request_wallet_withdrawal_to_destination(uuid,numeric,text,text,text)','EXECUTE') AS authenticated`);
      expect(access.rows).toEqual([{ anon: false, authenticated: false }]);
    } finally {
      await db.close();
    }
  }, 30000);
});