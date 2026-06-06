import { Link, useLocation } from "@tanstack/react-router";
import { Home as HomeIcon, Compass, Package, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: HomeIcon },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/subscribe", label: "Subscribe", Icon: Package },
  { to: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
      <div className="m-3 flex items-center justify-around rounded-full bg-primary px-3 py-2.5 shadow-2xl">
        {tabs.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${
                active ? "bg-cta text-cta-foreground" : "text-primary-foreground/70"
              }`}
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
              {active && <span className="text-xs font-semibold">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
