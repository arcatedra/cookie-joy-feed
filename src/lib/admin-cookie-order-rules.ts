/** Estados y transiciones del admin de pedidos de galletas (puro, sin red). */
export type CookieAdminAction = "preparando" | "listo" | "entregado" | "cancelar" | "reembolsar";

export const COOKIE_STATUS_FILTERS = [
  { value: "pagado", label: "Pagado" },
  { value: "preparando", label: "En preparación" },
  { value: "listo", label: "Listo" },
  { value: "enviado", label: "En camino" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "pendiente_pago", label: "Pendiente de pago" },
] as const;

export const COOKIE_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pendiente_pago: "Pendiente de pago",
  autorizacion_fallida: "Pendiente de pago",
  autorizado: "Pagado",
  pagado: "Pagado",
  preparando: "En preparación",
  listo: "Listo",
  enviado: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

const UNPAID = ["pendiente", "pendiente_pago", "autorizacion_fallida"];
export const isUnpaid = (estado: string) => UNPAID.includes(estado);
export const statusGroup = (estado: string) => (isUnpaid(estado) ? "pendiente_pago" : estado === "autorizado" ? "pagado" : estado);

export function allowedActions(o: { estado: string; monto_capturado: number | null }): CookieAdminAction[] {
  const e = o.estado;
  const paid = Number(o.monto_capturado ?? 0) > 0;
  const out: CookieAdminAction[] = [];
  if (e === "pagado") out.push("preparando");
  if (e === "preparando") out.push("listo");
  if (e === "listo" || e === "enviado") out.push("entregado");
  if (isUnpaid(e) || (!paid && ["pagado", "autorizado", "preparando", "listo"].includes(e))) out.push("cancelar");
  if (paid && e !== "reembolsado" && e !== "cancelado") out.push("reembolsar");
  return out;
}

export function assertAction(o: { estado: string; monto_capturado: number | null }, action: CookieAdminAction) {
  if (!allowedActions(o).includes(action)) throw new Error("Esta acción no está permitida en el estado actual del pedido.");
}

const NY_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

/** Día de entrega: el siguiente lunes, miércoles o viernes después del día del pedido (hora de Nueva York). */
export function cookieDeliveryDate(createdAt: string | Date, mask = 42): string {
  const [y, m, d] = NY_DAY.format(new Date(createdAt)).split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  for (let i = 1; i <= 7; i++) {
    const c = new Date(day.getTime() + i * 86400000);
    if (mask & (1 << c.getUTCDay())) return c.toISOString().slice(0, 10);
  }
  return new Date(day.getTime() + 86400000).toISOString().slice(0, 10);
}

export const nyToday = (now = new Date()) => NY_DAY.format(now);
