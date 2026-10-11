import { z } from "zod";

export const blockConfigSchema = z.object({
  minOrders: z.number().int().min(3).default(3),
  smallMaxLb: z.number().positive().default(15), mediumMaxLb: z.number().positive().default(30),
  includedLb: z.number().positive().default(45), maxOrderLb: z.number().positive().default(80),
  smallUsd: z.number().min(0).default(12), mediumUsd: z.number().min(0).default(25), largeUsd: z.number().min(0).default(35),
  extraLbUsd: z.number().min(0).default(0.7), elevatorUsd: z.number().min(0).default(5), stairsUsd: z.number().min(0).default(8),
  elevatorMinutes: z.number().int().min(0).default(5), stairsMinutes: z.number().int().min(0).default(8),
  heavyItemLb: z.number().positive().default(8), lightStopsHour: z.number().positive().default(5), otherStopsHour: z.number().positive().default(4),
  suggestedStopUsd: z.number().min(0).default(10), minimumHourlyUsd: z.number().positive().default(23),
  bikeLb: z.number().positive().default(50), cargoBikeLb: z.number().positive().default(200), motorcycleLb: z.number().positive().default(60),
  carLb: z.number().positive().default(400), vanLb: z.number().positive().default(1000),
  suggestedPayUsd: z.number().min(0).default(40), unassignedAlertHours: z.number().positive().default(12),
  autoAssignMinutes: z.number().int().min(1).default(15), weeklyBonusUsd: z.number().min(0).default(25),
  bonusMinBlocks: z.number().int().min(1).default(5), bonusOnTimePct: z.number().min(0).max(100).default(95),
  bonusRating: z.number().min(1).max(5).default(4.7), bonusMaxComplaints: z.number().int().min(0).default(0),
  bonusMaxLateCancels: z.number().int().min(0).default(0), lateCancelHours: z.number().positive().default(12),
  priorityPenaltyDays: z.number().int().min(0).default(7), overtimeMinutes: z.number().min(0).default(30),
  noShowMinutes: z.number().min(0).default(5), claimHours: z.number().positive().default(24),
}).refine((c) => c.smallMaxLb < c.mediumMaxLb && c.mediumMaxLb < c.includedLb && c.includedLb < c.maxOrderLb,
  { message: "Los límites de peso deben estar en orden creciente." });

export type BlockConfig = z.infer<typeof blockConfigSchema>;
export const DEFAULT_BLOCK_CONFIG = blockConfigSchema.parse({});
export type DoorService = "lobby" | "elevator" | "stairs";
export function blockOrderQuote(weight: number, door: DoorService, config: BlockConfig = DEFAULT_BLOCK_CONFIG) {
  if (!Number.isFinite(weight) || weight < 0) throw new Error("El peso no es válido.");
  if (weight > config.maxOrderLb) throw new Error(`Máximo ${config.maxOrderLb} lb por pedido. Divide tu compra en dos pedidos.`);
  const size = weight <= config.smallMaxLb ? "Pequeño" : weight <= config.mediumMaxLb ? "Mediano" : "Grande";
  const base = size === "Pequeño" ? config.smallUsd : size === "Mediano" ? config.mediumUsd : config.largeUsd;
  const extra = Math.max(0, weight - config.includedLb) * config.extraLbUsd;
  const doorUsd = door === "elevator" ? config.elevatorUsd : door === "stairs" ? config.stairsUsd : 0;
  return { size, deliveryCents: Math.round((base + extra) * 100), extraCents: Math.round(extra * 100), doorCents: Math.round(doorUsd * 100), doorMinutes: door === "elevator" ? config.elevatorMinutes : door === "stairs" ? config.stairsMinutes : 0 };
}

export function blockVehicleCapacity(vehicle: string, c: BlockConfig = DEFAULT_BLOCK_CONFIG) {
  switch (vehicle) {
    case "bicicleta": case "e-bike": return c.bikeLb;
    case "bici_carga": return c.cargoBikeLb;
    case "moto": return c.motorcycleLb;
    case "auto": case "carro": return c.carLb;
    case "van": return c.vanLb;
    default: return 0;
  }
}

export function estimateBlockMinutes(stops: Array<{ weightLb: number; door: DoorService }>, c: BlockConfig = DEFAULT_BLOCK_CONFIG) {
  return Math.ceil(stops.reduce((minutes, stop) => minutes + 60 / (stop.weightLb <= c.smallMaxLb ? c.lightStopsHour : c.otherStopsHour)
    + blockOrderQuote(stop.weightLb, stop.door, c).doorMinutes, 0));
}

export function assertPublishableBlock(baseUsd: number, estimatedMinutes: number, c: BlockConfig = DEFAULT_BLOCK_CONFIG) {
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 60 || estimatedMinutes > 240) throw new Error("El bloque debe durar entre una y cuatro horas.");
  const minimumCents = Math.ceil(c.minimumHourlyUsd * 100 * estimatedMinutes / 60);
  if (!Number.isFinite(baseUsd) || Math.round(baseUsd * 100) < minimumCents) throw new Error(`El pago base debe ser al menos $${(minimumCents / 100).toFixed(2)}; propinas y bonos no cuentan para este mínimo.`);
}

export function assertBlockOrderCount(orderCount: number, c: BlockConfig = DEFAULT_BLOCK_CONFIG) {
  if (!Number.isInteger(orderCount) || orderCount < c.minOrders) {
    throw new Error(`Un lote necesita al menos ${c.minOrders} pedidos.`);
  }
}

export function manualBlockPay(baseUsd: number, increaseUsd: number, doorBonusEnabled: boolean, doorBonusUsd: number) {
  for (const value of [baseUsd, increaseUsd, doorBonusUsd]) {
    if (!Number.isFinite(value) || value < 0) throw new Error("Los montos del lote no son válidos.");
  }
  return Math.round((baseUsd + increaseUsd + (doorBonusEnabled ? doorBonusUsd : 0)) * 100) / 100;
}