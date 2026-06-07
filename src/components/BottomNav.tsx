import { Link, useLocation } from "@tanstack/react-router";
import { Home as HomeIcon, Search, Package, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/explore", label: "Explore", Icon: Search },
  { to: "/subscribe", label: "Subscribe", Icon: Package },
  { to: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
      <div className="m-3 flex items-center justify-between rounded-[32px] bg-primary px-2 py-2 shadow-2xl shadow-primary/20">
        {tabs.map(({ to, label, Icon }) => {
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
