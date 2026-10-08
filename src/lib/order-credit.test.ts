import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { releaseOrderCredit, reserveOrderCredit } from "./order-credit.server";

describe("operaciones de saldo sin dinero real", () => {
  it("envía el ambiente y el máximo al control atómico y convierte a centavos", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "4.50", error: null });
    const db = { rpc } as unknown as SupabaseClient<Database>;
    await expect(reserveOrderCredit(db, "cookie", "PRUEBA", 750, "sandbox")).resolves.toBe(450);
    expect(rpc).toHaveBeenCalledWith("reserve_order_credit", { p_kind: "cookie", p_order: "PRUEBA", p_limit: 7.5, p_environment: "sandbox" });
  });
  it("no continúa el pago cuando no se puede apartar el saldo", async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "fallo simulado" } }) } as unknown as SupabaseClient<Database>;
    await expect(reserveOrderCredit(db, "store", "PRUEBA", 500, "sandbox")).rejects.toThrow("No se pudo apartar");
    await expect(releaseOrderCredit(db, "store", "PRUEBA")).rejects.toThrow("No se pudo devolver");
  });
  it("usa la devolución idempotente de la base de datos", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await releaseOrderCredit({ rpc } as unknown as SupabaseClient<Database>, "store", "PRUEBA");
    expect(rpc).toHaveBeenCalledWith("release_order_credit", { p_kind: "store", p_order: "PRUEBA" });
  });
});