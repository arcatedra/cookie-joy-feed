import { Link, useLocation } from "@tanstack/react-router";
import { Home as HomeIcon, Search, Package, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { getMyDeliveryStatus } from "@/lib/deliveries.functions";

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
  const { user } = useAuth();
  const getStatus = useServerFn(getMyDeliveryStatus);

  const { data: status } = useQuery({
    queryKey: ["delivery-status"],
    queryFn: () => getStatus(),
    enabled: !!user,
    staleTime: 30_000,
  });

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
          return (
            <Link
              key={to}
              to={to}
              className="group flex flex-1 justify-center"
              aria-label={label}
            >
              <div className="rounded-full p-2.5 transition-colors hover:bg-primary-foreground/5">
                <Icon
                  className="h-[22px] w-[22px] text-primary-foreground opacity-60 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.5}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
