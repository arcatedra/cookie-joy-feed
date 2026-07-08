import { Link, useLocation } from "@tanstack/react-router";
import { Home as HomeIcon, Search, Package, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionGate } from "@/lib/subscription-gate";

const tabs = [
  { to: "/", key: "home", Icon: HomeIcon },
  { to: "/explore", key: "explore", Icon: Search },
  { to: "/subscribe", key: "subscribe", Icon: Package },
  { to: "/profile", key: "profile", Icon: User },
] as const;

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useTranslation();
  const { deliveryStatus: status } = useSubscriptionGate();

  const remaining = status?.hasActiveSubscription ? status.remaining : null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
      <div className="m-3 flex items-center justify-between rounded-[32px] bg-primary px-2 py-2 shadow-2xl shadow-primary/20">
        {tabs.map(({ to, key, Icon }) => {
          const label = t(`nav.${key}`);
          const active = pathname === to;
          if (active) {
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-full bg-cta px-4 py-2.5 transition-all duration-300"
                aria-label={label}
              >
                <Icon className="h-5 w-5 text-cta-foreground" strokeWidth={2} />
                <span className="text-sm font-medium tracking-wide text-cta-foreground">
                  {label}
                </span>
              </Link>
            );
          }
          const isSubscribe = key === "subscribe";
          return (
            <Link
              key={to}
              to={to}
              className="group flex flex-1 justify-center"
              aria-label={label}
            >
              <div className="relative rounded-full p-2.5 transition-colors hover:bg-primary-foreground/5">
                <Icon
                  className="h-[22px] w-[22px] text-primary-foreground opacity-60 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.5}
                />
                {isSubscribe && remaining !== null && remaining > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#1a0f0a]">
                    {remaining}
                  </span>
                )}
                {isSubscribe && remaining === 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
