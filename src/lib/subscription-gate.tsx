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

const ACTIVE = new Set(["active", "trialing", "past_due"]);

interface GateValue {
  canPurchase: boolean;
  loading: boolean;
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

  const canPurchase = useMemo(() => {
    const sub = query.data?.subscription;
    return !!user && !!sub && ACTIVE.has(sub.status ?? "");
  }, [user, query.data]);

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
          if (sub && ACTIVE.has(sub.status ?? "")) {
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
      guard,
      openPrompt,
      refresh,
      refreshUntilActive,
    }),
    [canPurchase, authLoading, user, query.isLoading, guard, openPrompt, refresh, refreshUntilActive],
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


/** Promotional banner shown on Home and Profile when the user has no active subscription. */
export function SubscribePromoBanner({ className = "" }: { className?: string }) {
  const { canPurchase, loading } = useSubscriptionGate();
  const { t } = useTranslation();
  if (loading || canPurchase) return null;
  return (
    <Link
      to="/subscribe"
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-5 text-white shadow-lg ring-1 ring-amber-900/20 transition hover:shadow-xl ${className}`}
    >
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-100/90">
            {t("subscribeGate.bannerEyebrow")}
          </p>
          <h3 className="mt-0.5 text-base font-extrabold leading-tight sm:text-lg">
            {t("subscribeGate.bannerTitle")}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-50">
            <Truck className="h-3.5 w-3.5" />
            {t("subscribeGate.bannerSubcopy")}
          </p>
        </div>
        <span className="self-center rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-amber-700 shadow group-hover:bg-amber-50">
          {t("subscribeGate.bannerCta")}
        </span>
      </div>
    </Link>
  );
}

