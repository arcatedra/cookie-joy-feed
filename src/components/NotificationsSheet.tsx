import { useState } from "react";
import { Bell, Package, Heart, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Notification {
  id: string;
  icon: "order" | "like" | "promo";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: "n1",
    icon: "order",
    title: "Order Shipped",
    body: "Your 12-Pack is on its way! Estimated arrival tomorrow.",
    time: "10 min ago",
    read: false,
  },
  {
    id: "n2",
    icon: "like",
    title: "New Favorite",
    body: "Double Chocolate Mint is trending this week.",
    time: "2 hrs ago",
    read: false,
  },
  {
    id: "n3",
    icon: "promo",
    title: "Weekend Special",
    body: "Get 20% off all cookie packs until Sunday.",
    time: "1 day ago",
    read: true,
  },
];

function iconFor(type: Notification["icon"]) {
  switch (type) {
    case "order":
      return (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
      );
    case "like":
      return (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-500/10">
          <Heart className="h-5 w-5 text-rose-500" />
        </div>
      );
    case "promo":
      return (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-cta/10">
          <Tag className="h-5 w-5 text-cta" />
        </div>
      );
  }
}

export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <SheetHeader className="px-5 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              {t("common.notifications")}
            </SheetTitle>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-semibold text-cta"
            >
              {t("common.markRead")}
            </button>
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-5 pb-8">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl p-3 transition ${
                n.read ? "bg-transparent" : "bg-primary/5"
              }`}
            >
              {iconFor(n.icon)}
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {n.time}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-cta" />
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
