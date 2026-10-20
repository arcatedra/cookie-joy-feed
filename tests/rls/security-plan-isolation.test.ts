import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// No network clients: all identities and records exist only in disposable PostgreSQL.
const db = new PGlite();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function existingFunction(file: string, name: string) {
  const sql = readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8');
  const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`, 'i'));
  if (!match) throw new Error(`Missing existing function: ${name}`);
  return match[0];
}
async function asCustomer(n: number, sql: string) {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid(n)}',false);`);
  try { return (await db.query(sql)).rows; }
  finally { await db.exec('RESET ROLE'); }
}

describe('existing security functions in isolated PostgreSQL', () => {
  beforeAll(async () => {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE pedidos(id uuid, cliente_id uuid);
      CREATE TABLE delivery_routes(id uuid, total_stops integer);
      CREATE TABLE route_stops(order_id uuid, route_id uuid, delivered_at timestamptz,
        delivery_photo_url text, delivery_note text, recipient_name text, status text,
        eta timestamptz, sequence_number integer);
      CREATE TABLE clientes(id uuid, nombre_completo text);
      CREATE TABLE reels(id uuid);
      CREATE TABLE reel_comments(user_id uuid, reel_id uuid);
      INSERT INTO pedidos VALUES('${uid(10)}','${uid(1)}');
      INSERT INTO delivery_routes VALUES('${uid(20)}',3);
      INSERT INTO route_stops VALUES('${uid(10)}','${uid(20)}','2026-10-20T12:00:00Z',
        'PRUEBA/foto.jpg','PRUEBA entrega','PRUEBA Persona','entregado','2026-10-20T12:00:00Z',2);
      INSERT INTO clientes VALUES('${uid(1)}','PRUEBA Uno Apellido'),('${uid(2)}','PRUEBA Dos Apellido');
      INSERT INTO reels VALUES('${uid(30)}');
      INSERT INTO reel_comments VALUES('${uid(1)}','${uid(30)}');
    `);
    await db.exec(existingFunction('20260914233605_0fa392b7-ca98-4698-88b6-513c626bb66d.sql', 'get_my_delivery_proof'));
    await db.exec(existingFunction('20260914230610_46e7bd99-3bdc-414a-8305-d46020242d8a.sql', 'get_my_stop_eta'));
    await db.exec(existingFunction('20261008153854_d7822e83-8237-4387-a1bd-fe574e445e45.sql', 'get_public_profiles'));
    await db.exec(`REVOKE ALL ON FUNCTION get_my_delivery_proof(uuid),get_my_stop_eta(uuid),get_public_profiles(uuid[]) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION get_my_delivery_proof(uuid),get_my_stop_eta(uuid),get_public_profiles(uuid[]) TO authenticated;`);
  });
  afterAll(async () => { await db.close(); });

  it('customer can read their own delivery proof', async () => {
    expect(await asCustomer(1, `SELECT * FROM get_my_delivery_proof('${uid(10)}')`))
      .toEqual([expect.objectContaining({ delivery_photo_url: 'PRUEBA/foto.jpg', status: 'entregado' })]);
  });
  it('another customer cannot read that delivery proof', async () => {
    expect(await asCustomer(2, `SELECT * FROM get_my_delivery_proof('${uid(10)}')`)).toEqual([]);
  });
  it('customer can read their own ETA and stop position', async () => {
    expect(await asCustomer(1, `SELECT * FROM get_my_stop_eta('${uid(10)}')`))
      .toEqual([expect.objectContaining({ sequence_number: 2, total_stops: 3 })]);
  });
  it('another customer cannot read that ETA', async () => {
    expect(await asCustomer(2, `SELECT * FROM get_my_stop_eta('${uid(10)}')`)).toEqual([]);
  });
  it('public names return only a commenter first name, not a non-commenter', async () => {
    expect(await asCustomer(2, `SELECT * FROM get_public_profiles(ARRAY['${uid(1)}','${uid(2)}']::uuid[])`))
      .toEqual([{ id: uid(1), display_name: 'PRUEBA' }]);
  });
});