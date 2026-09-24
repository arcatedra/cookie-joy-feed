/**
 * Hazorex ya no usa suscripciones: se cobra por pedido.
 * Este módulo se mantiene solo para no romper imports antiguos; nunca
 * bloquea compras ni entregas y no consulta ninguna tabla de suscripciones.
 */
import type { ReactNode } from "react";
import { emptyDeliveryStatus, type DeliveryStatus, type SubscriptionSummary } from "@/lib/subscription-status";

interface GateValue {
  canPurchase: boolean;
  loading: boolean;
  subscription: SubscriptionSummary | null;
  deliveryStatus: DeliveryStatus;
  guard: (action?: () => void) => boolean;
  openPrompt: () => void;
  refresh: () => Promise<void>;
  refreshUntilActive: (timeoutMs?: number) => Promise<RefreshResult>;
}

export interface RefreshResult {
  active: boolean;
  attempts: number;
  errors: number;
  lastError?: string;
}

const VALUE: GateValue = {
  canPurchase: true,
  loading: false,
  subscription: null,
  deliveryStatus: emptyDeliveryStatus,
  guard: (action) => {
    action?.();
    return true;
  },
  openPrompt: () => {},
  refresh: async () => {},
  refreshUntilActive: async () => ({ active: true, attempts: 0, errors: 0 }),
};

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSubscriptionGate(): GateValue {
  return VALUE;
}

export function SubscribePromoBanner(_: { className?: string }) {
  return null;
}
