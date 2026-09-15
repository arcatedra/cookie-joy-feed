/**
 * Hazorex — Marketplace de tiendas (Fase 1).
 * Tipos compartidos y utilidades de horario. Sin lógica de servidor.
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface DayHours {
  closed: boolean;
  open: string; // "09:00"
  close: string; // "20:00"
}

export type StoreSchedule = Partial<Record<DayKey, DayHours>>;

export const DEFAULT_DAY: DayHours = { closed: false, open: "09:00", close: "20:00" };

export interface StoreCategory {
  id: string;
  business_id: string;
  nombre: string;
  orden: number;
}

export interface StoreProduct {
  id: string;
  business_id: string;
  category_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  unidad: string;
  imagen_url: string | null;
  disponible: boolean;
  orden: number;
}

export interface StoreSummary {
  id: string;
  slug: string;
  business_name: string;
  business_type: string;
  city: string | null;
  logo_url: string | null;
  zonas_que_atiende: string[];
}

export interface StoreDetail extends StoreSummary {
  banner_url: string | null;
  descripcion: string | null;
  horario: StoreSchedule;
  address: string;
}

export const UNIT_OPTIONS = ["unidad", "lb", "oz", "kg", "paquete", "docena", "litro"] as const;

/** Índice 0 = lunes, para casar con DAY_KEYS. */
function todayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
}

/**
 * ¿La tienda está abierta ahora? Se evalúa en la hora local del visitante.
 * Si no hay horario configurado, se considera abierta.
 */
export function isStoreOpen(schedule: StoreSchedule | null | undefined, now = new Date()): boolean {
  if (!schedule || Object.keys(schedule).length === 0) return true;
  const key = DAY_KEYS[todayIndex(now)]!;
  const day = schedule[key];
  if (!day) return true;
  if (day.closed) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = minutesOf(day.open ?? "00:00");
  const to = minutesOf(day.close ?? "23:59");
  if (to <= from) return cur >= from || cur <= to; // cruza medianoche
  return cur >= from && cur <= to;
}

export function todayHoursLabel(schedule: StoreSchedule | null | undefined, now = new Date()): string | null {
  if (!schedule) return null;
  const key = DAY_KEYS[todayIndex(now)]!;
  const day = schedule[key];
  if (!day) return null;
  if (day.closed) return null;
  return `${day.open} – ${day.close}`;
}

export function normalizeSchedule(raw: unknown): StoreSchedule {
  const out: StoreSchedule = {};
  const obj = (raw ?? {}) as Record<string, Partial<DayHours> | undefined>;
  for (const k of DAY_KEYS) {
    const v = obj[k];
    out[k] = {
      closed: Boolean(v?.closed),
      open: v?.open ?? DEFAULT_DAY.open,
      close: v?.close ?? DEFAULT_DAY.close,
    };
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
}
