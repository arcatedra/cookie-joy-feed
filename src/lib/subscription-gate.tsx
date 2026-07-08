import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Truck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMySubscription } from "@/lib/subscriptions.functions";
import {
  emptyDeliveryStatus,
  isSubscriptionActive,
  type DeliveryStatus,
  type SubscriptionSummary,
} from "@/lib/subscription-status";

interface GateValue {
  canPurchase: boolean;
  loading: boolean;
  subscription: SubscriptionSummary | null;
  deliveryStatus: DeliveryStatus;
  /** Returns true and runs `action` if the user can purchase; otherwise opens the prompt and returns false. */
  guard: (action?: () => void) => boolean;
  openPrompt: () => void;
  /** Force a refresh of the subscription status (e.g. after returning from Stripe). */
  refresh: () => Promise<void>;
  /** Refresh repeatedly until `canPurchase` becomes true, returning a structured result. */
  refreshUntilActive: (timeoutMs?: number) => Promise<RefreshResult>;
}

export interface RefreshResult {
  active: boolean;
  attempts: number;
  errors: number;
  lastError?: string;
}


const Ctx = createContext<GateValue | null>(null);

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const getSub = useServerFn(getMySubscription);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryKey = useMemo(() => ["my-subscription", user?.id ?? null] as const, [user?.id]);

  const query = useQuery({
    queryKey,
    queryFn: () => getSub(),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const sub = query.data?.subscription;
  const deliveryStatus = query.data?.deliveryStatus ?? emptyDeliveryStatus();
  const canPurchase = isSubscriptionActive(sub);

  const openPrompt = useCallback(() => setOpen(true), []);

  const guard = useCallback(
    (action?: () => void) => {
      if (canPurchase) {
        action?.();
        return true;
      }
      setOpen(true);
      return false;
    },
    [canPurchase],
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    await qc.invalidateQueries({ queryKey });
    await qc.refetchQueries({ queryKey });
  }, [qc, queryKey, user]);

  const refreshUntilActive = useCallback(
    async (timeoutMs = 20_000): Promise<RefreshResult> => {
      if (!user) return { active: false, attempts: 0, errors: 0 };
      const deadline = Date.now() + timeoutMs;
      let delay = 800;
      let attempts = 0;
      let errors = 0;
      let lastError: string | undefined;
      while (Date.now() < deadline) {
        attempts++;
        try {
          await qc.invalidateQueries({ queryKey });
          const data = await qc.fetchQuery({ queryKey, queryFn: () => getSub() });
          const sub = data?.subscription;
          if (isSubscriptionActive(sub)) {
            return { active: true, attempts, errors, lastError };
          }
        } catch (e) {
          errors++;
          lastError = e instanceof Error ? e.message : String(e);
          console.warn("[subscription-gate] refresh attempt failed", lastError);
        }
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 3000);
      }
      return { active: false, attempts, errors, lastError };
    },
    [getSub, qc, queryKey, user],
  );


  // Refresh when tab becomes visible (covers return from Stripe in same tab).
  useEffect(() => {
    if (!user) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [qc, queryKey, user]);

  // Realtime: react instantly when the webhook upserts the user's subscription row.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subscriptions:user:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["delivery-status"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, queryKey, user]);

  const value = useMemo<GateValue>(
    () => ({
      canPurchase,
      loading: authLoading || (!!user && query.isLoading),
      subscription: sub ?? null,
      deliveryStatus,
      guard,
      openPrompt,
      refresh,
      refreshUntilActive,
    }),
    [canPurchase, authLoading, user, query.isLoading, sub, deliveryStatus, guard, openPrompt, refresh, refreshUntilActive],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <SubscribeRequiredDialog open={open} onOpenChange={setOpen} signedIn={!!user} />
    </Ctx.Provider>
  );
}

export function useSubscriptionGate(): GateValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback when provider isn't mounted yet (SSR / error boundary)
    return {
      canPurchase: false,
      loading: false,
        subscription: null,
        deliveryStatus: emptyDeliveryStatus(),
      guard: () => false,
      openPrompt: () => {},
      refresh: async () => {},
      refreshUntilActive: async () => ({ active: false, attempts: 0, errors: 0 }),
    };
  }
  return ctx;
}


function SubscribeRequiredDialog({
  open,
  onOpenChange,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signedIn: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            {t("subscribeGate.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("subscribeGate.dialogDesc")}
            <span className="mt-2 block font-semibold text-emerald-700">
              {t("subscribeGate.freeShipping")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col sm:space-x-0 gap-2">
          <Button asChild className="w-full">
            <Link to={signedIn ? "/subscribe" : "/auth"} onClick={() => onOpenChange(false)}>
              {signedIn ? t("subscribeGate.viewPlans") : t("subscribeGate.signInAndSubscribe")}
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {t("subscribeGate.keepBrowsing")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/** Banner promocional opcional. Oculto: la suscripción ya no es obligatoria para comprar. */
export function SubscribePromoBanner(_: { className?: string }) {
  return null;
}

