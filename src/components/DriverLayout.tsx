import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, DollarSign, FileText, LogOut, Menu, User as UserIcon, X, Store } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { getDriverStatus, setOnlineStatus } from "@/lib/courier.functions";

const TEAL = "#0f766e";
const TEAL_DARK = "#134e4a";
const TEAL_LIGHT = "#5eead4";

const navItems = [
  { to: "/repartidor", label: "Dashboard", icon: Bike, exact: true },
  { to: "/repartidor/wallet", label: "Ganancias", icon: DollarSign },
  { to: "/repartidor/facturas", label: "Facturas", icon: FileText },
  { to: "/repartidor/calificaciones", label: "Perfil", icon: UserIcon },
] as const;

export function DriverLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const setOnlineFn = useServerFn(setOnlineStatus);
  const status = useQuery({
    queryKey: ["courier", "driver-status"],
    queryFn: () => getDriverStatus(),
  });

  const toggleOnline = useMutation({
    mutationFn: (online: boolean) => setOnlineFn({ data: { online } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courier", "driver-status"] }),
  });

  const isOnline = !!status.data?.is_online;
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === to + "/" : pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="sticky top-0 z-40 border-b shadow-sm"
        style={{ background: `linear-gradient(90deg, ${TEAL_DARK}, ${TEAL})`, borderColor: TEAL_LIGHT + "40" }}
      >
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 md:gap-6 md:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-1.5 text-white/90 hover:bg-white/10 md:hidden"
            aria-label="Menú"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/repartidor" className="flex items-center gap-2 text-white">
            <Bike className="h-6 w-6" style={{ color: TEAL_LIGHT }} />
            <span className="text-lg font-black tracking-[0.12em]">HAZOREX</span>
            <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/90 sm:inline-block">
              Repartidor
            </span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition ${
                  isActive(it.to, "exact" in it && it.exact)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white">
              <span
                className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-400"}`}
                aria-hidden
              />
              <span className="hidden text-xs font-semibold sm:inline">
                {isOnline ? "Activo" : "Inactivo"}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={(v) => toggleOnline.mutate(v)}
                disabled={toggleOnline.isPending || status.isLoading}
                aria-label="Estado activo"
              />
            </div>

            <Link
              to="/"
              className="hidden items-center gap-1 rounded px-2 py-1 text-xs text-white/70 hover:text-white lg:flex"
              title="Ir a la tienda"
            >
              <Store className="h-3.5 w-3.5" />
              Tienda
            </Link>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="rounded p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/10 bg-[color:var(--teal-dark)] px-4 py-2 md:hidden" style={{ background: TEAL_DARK }}>
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                  isActive(it.to, "exact" in it && it.exact)
                    ? "bg-white/15 text-white"
                    : "text-white/80"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            ))}
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center gap-2 rounded px-3 py-2 text-sm text-white/70"
            >
              <Store className="h-4 w-4" />
              Ir a la tienda
            </Link>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">{children}</main>

      <footer className="mt-8 border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <span>Panel de repartidor · Hazorex</span>
        {user?.email ? <span className="ml-2 text-slate-400">· {user.email}</span> : null}
      </footer>
    </div>
  );
}
