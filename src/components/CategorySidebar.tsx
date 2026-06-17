import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";


interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const groups = [
  {
    key: "shop",
    items: [
      { label: "allCookies", to: "/menu" },
      { label: "filled", to: "/menu" },
      { label: "healthy", to: "/menu" },
      { label: "giftBoxes", to: "/menu" },
      { label: "vegan", to: "/menu" },
      { label: "brownies", to: "/menu" },
    ],
  },
  {
    key: "discover",
    items: [
      { label: "bestSellers", to: "/explore" },
      { label: "deals", to: "/explore" },
      { label: "buildPack", to: "/menu" },
      { label: "subscriptions", to: "/subscribe" },
    ],
  },
  {
    key: "account",
    items: [
      { label: "yourAccount", to: "/profile" },
      { label: "ordersReturns", to: "/profile" },
      { label: "cart", to: "/cart" },
      { label: "signIn", to: "/auth" },
    ],
  },
] as const;

export function CategorySidebar({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[88%] max-w-sm overflow-y-auto bg-background p-0">
        <SheetHeader className="bg-[#1a0f0a] px-5 py-5 text-left">
          <SheetTitle className="text-base font-bold text-white">
            {user
              ? t("topnav.helloUser", { name: displayName ?? "" })
              : t("topnav.helloSignIn")}
          </SheetTitle>
        </SheetHeader>


        {groups.map((g) => (
          <div key={g.key} className="border-b border-border py-2">
            <p className="px-5 py-2 text-sm font-bold text-foreground">
              {t(`topnav.groups.${g.key}`)}
            </p>
            <ul>
              {g.items.map((item, i) => (
                <li key={`${g.key}-${i}`}>
                  <Link
                    to={item.to}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between px-5 py-2.5 text-sm text-foreground transition hover:bg-muted"
                  >
                    <span>{t(`topnav.cats.${item.label}`)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </SheetContent>
    </Sheet>
  );
}
