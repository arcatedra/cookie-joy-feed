import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  User,
  Package,
  Cookie,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CategorySidebar } from "@/components/CategorySidebar";
import { HazorexSymbol } from "@/components/HazorexLogo";
import { DeliveryCounter } from "@/components/DeliveryCounter";

const categoryKeys = ["all", "filled", "healthy", "giftBoxes"] as const;

const quickLinkKeys = [
  { key: "deals", to: "/explore" },
  { key: "shop", to: "/shop", label: "🛍️ Tienda" },
  { key: "roulette", to: "/ruleta", label: "🎰 Porcenje" },
  { key: "bestSellers", to: "/menu" },
  { key: "buildPack", to: "/menu" },
  { key: "support", to: "/profile" },
  { key: "subscriptions", to: "/subscribe" },
  
] as const;


export function TopNav() {
  const { t } = useTranslation();
  const cart = useCart();
  const { user, signOut } = useAuth();

  const navigate = useNavigate();

  const [sideOpen, setSideOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const goSearch = () => { setSearchOpen(false); navigate({ to: "/search" }); };
  const [searchVal, setSearchVal] = useState("");
  const [category, setCategory] = useState<(typeof categoryKeys)[number]>("all");

  const acctRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (acctRef.current && !acctRef.current.contains(target)) setAcctOpen(false);
      if (catRef.current && !catRef.current.contains(target)) setCatOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const suggestions = [
    "Chocolate Chunk",
    "Snickerdoodle",
    "Double Choc Mint",
    "12-Pack Gift Box",
    "Vegan Chunk",
  ].filter((s) => !searchVal || s.toLowerCase().includes(searchVal.toLowerCase()));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#C8862E]/30 bg-[#0B0B0F] text-white shadow-[0_2px_20px_-4px_rgba(0,0,0,0.6)]">
        {/* Top row */}
        <div className="flex items-center gap-2 px-3 py-2 md:gap-4 md:px-6 md:py-2.5">
          {/* Mobile hamburger removed per request */}


          {/* Logo — símbolo + nombre tipo Amazon */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1 py-1 md:gap-1.5 md:py-1.5"
            aria-label="HAZOREX"
          >
            <HazorexSymbol size={40} className="sm:hidden" />
            <HazorexSymbol size={52} className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-xl font-black tracking-[0.15em] text-transparent sm:text-2xl md:text-3xl">
              HAZOREX
            </span>
          </Link>


          {/* Delivery address — desktop */}
          <button
            type="button"
            className="hidden shrink-0 items-center gap-1 rounded px-2 py-1.5 text-left hover:ring-1 hover:ring-white/40 lg:flex"
          >
            <MapPin className="h-4 w-4 text-amber-300" />
            <span className="leading-tight">
              <span className="block text-[10px] text-white/70">
                {t("topnav.deliverTo")}
              </span>
              <span className="block text-xs font-bold">
                {t("topnav.updateLocation")}
              </span>
            </span>
          </button>

          {/* Search bar */}
          <div ref={searchRef} className="relative flex-1 min-w-0">
            <div className="flex items-stretch overflow-hidden rounded-md bg-white text-gray-900 shadow-sm focus-within:ring-2 focus-within:ring-amber-300">
              {/* Category dropdown */}
              <div ref={catRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setCatOpen((o) => !o)}
                  className="flex h-full items-center gap-1 border-r border-[#16294a] bg-[#1f3a5f] px-3 text-xs font-semibold text-white hover:bg-[#16294a]"
                  aria-haspopup="listbox"
                  aria-expanded={catOpen}
                >
                  <span className="max-w-[8rem] truncate">{t(`topnav.cats.${category}`)}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {catOpen && (
                  <ul
                    role="listbox"
                    className="absolute left-0 top-full z-50 mt-0.5 w-48 overflow-hidden rounded-md border border-border bg-white shadow-lg"
                  >
                    {categoryKeys.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => { setCategory(c); setCatOpen(false); }}
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                            category === c ? "bg-amber-50 font-semibold" : ""
                          }`}
                        >
                          {t(`topnav.cats.${c}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
                placeholder={t("topnav.searchPlaceholder")}
                aria-label={t("common.search")}
                className="min-w-0 flex-1 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={goSearch}
                aria-label={t("common.search")}
                className="grid w-12 shrink-0 place-items-center bg-[#1f3a5f] text-white transition hover:bg-[#16294a]"
              >
                <Search className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {searchOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-white shadow-xl">
                <li className="border-b border-border bg-muted px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("topnav.suggestions")}
                </li>
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => { setSearchVal(s); goSearch(); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-amber-50"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Language */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {/* Account & Lists */}
          <div ref={acctRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setAcctOpen((o) => !o)}
              className="rounded px-2 py-1.5 text-left text-xs leading-tight hover:ring-1 hover:ring-white/40"
              aria-haspopup="menu"
              aria-expanded={acctOpen}
            >
              <span className="block text-[10px] text-white/70">
                {user ? t("topnav.helloUser", { name: user.email?.split("@")[0] ?? "" }) : t("topnav.helloSignIn")}
              </span>
              <span className="flex items-center gap-0.5 text-xs font-bold">
                {t("topnav.accountLists")}
                <ChevronDown className="h-3 w-3" />
              </span>
            </button>
            {acctOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-md border border-border bg-white text-foreground shadow-xl">
                <div className="bg-muted px-3 py-2 text-xs font-semibold">
                  {user ? user.email : t("topnav.signInPrompt")}
                </div>
                <Link to="/profile" onClick={() => setAcctOpen(false)} className="block px-3 py-2 text-sm hover:bg-amber-50">
                  {t("topnav.cats.yourAccount")}
                </Link>
                <Link to="/profile" onClick={() => setAcctOpen(false)} className="block px-3 py-2 text-sm hover:bg-amber-50">
                  {t("topnav.cats.ordersReturns")}
                </Link>
                <Link to="/subscribe" onClick={() => setAcctOpen(false)} className="block px-3 py-2 text-sm hover:bg-amber-50">
                  {t("topnav.cats.subscriptions")}
                </Link>
                <div className="border-t border-border" />
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        setAcctOpen(false);
                        await signOut();
                        navigate({ to: "/auth" });
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-amber-50"
                    >
                      {t("auth.switchAccount", "Cambiar de cuenta")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setAcctOpen(false);
                        await signOut();
                        navigate({ to: "/" });
                      }}
                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      {t("auth.signOut")}
                    </button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setAcctOpen(false)} className="block px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                    {t("auth.signIn")}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Returns & Orders */}
          <Link
            to="/profile"
            className="hidden shrink-0 rounded px-2 py-1.5 text-left text-xs leading-tight hover:ring-1 hover:ring-white/40 lg:block"
          >
            <span className="block text-[10px] text-white/70">{t("topnav.returns")}</span>
            <span className="flex items-center gap-1 text-xs font-bold">
              <Package className="h-3.5 w-3.5" />
              {t("topnav.andOrders")}
            </span>
          </Link>

          {/* Delivery counter */}
          <DeliveryCounter />

          {/* Cart */}
          <Link
            to="/cart"
            className="relative flex shrink-0 items-center gap-1.5 rounded-md bg-[#4A3525] px-2.5 py-1.5 text-[#F4F1EA] shadow-sm transition hover:bg-[#3a2a1d] hover:ring-1 hover:ring-amber-300/40"
            aria-label={t("common.viewCart")}
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span
                className={`absolute -right-2 -top-1 grid min-w-[18px] place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold leading-[18px] text-[#1a0f0a] ${
                  cart.count === 0 ? "opacity-60" : ""
                }`}
              >
                {cart.count}
              </span>
            </div>
            <span className="hidden text-xs font-bold md:inline">{t("topnav.cart")}</span>
          </Link>
        </div>

        {/* Mobile-only address & language row */}
        <div className="flex items-center justify-between gap-2 bg-[#0F172A] px-3 py-1.5 text-[11px] text-white/80 md:hidden">
          <button type="button" className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-amber-300" />
            <span>{t("topnav.deliverTo")} — {t("topnav.updateLocation")}</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* Sub-navbar */}
        <nav className="flex items-center gap-1 bg-[#0F172A] px-2 py-1.5 text-sm md:px-4">
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-bold text-white hover:ring-1 hover:ring-white/40"
          >
            <Menu className="h-4 w-4" />
            {t("topnav.all")}
          </button>
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            {quickLinkKeys.map((l) => {
              const isHighlighted = l.key === "shop" || l.key === "roulette";
              return (
                <Link
                  key={l.key}
                  to={l.to}
                  className={`shrink-0 rounded px-2 py-1 transition hover:ring-1 hover:ring-white/40 ${
                    isHighlighted
                      ? "bg-amber-300/20 font-bold text-amber-200 hover:bg-amber-300/30"
                      : "text-white/90"
                  }`}
                >
                  {"label" in l && l.label ? l.label : t(`topnav.links.${l.key}`)}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <CategorySidebar open={sideOpen} onOpenChange={setSideOpen} />
    </>
  );
}
