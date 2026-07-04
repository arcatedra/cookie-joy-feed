import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getUnreadNotificationCount,
  listMyNotifications,
  markNotificationRead,
} from "@/lib/support.functions";
import { SupportChatSheet } from "@/components/SupportChatSheet";

interface Notif {
  id: string;
  type: string;
  issue_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const getCount = useServerFn(getUnreadNotificationCount);
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatIssueId, setChatIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const r: any = await getCount({});
      setCount(r.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [user, getCount]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`cust-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshCount();
          if (open) loadList();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open]);

  const loadList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r: any = await listFn({});
      setItems(r.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, [user, listFn]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  if (!user) return null;

  const openChat = async (n: Notif) => {
    if (!n.read_at) {
      try {
        await markFn({ data: { id: n.id } });
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
        );
        refreshCount();
      } catch {
        /* ignore */
      }
    }
    if (n.issue_id) {
      setChatIssueId(n.issue_id);
      setChatOpen(true);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative hidden shrink-0 rounded px-2 py-1.5 text-white hover:ring-1 hover:ring-white/40 md:block"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
          <SheetHeader className="px-5 pt-6 pb-3">
            <SheetTitle className="text-lg font-bold">Notificaciones</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-3 pb-8">
            {loading && (
              <div className="grid place-items-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No tienes notificaciones.
              </p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openChat(n)}
                className={`flex items-start gap-3 rounded-xl p-3 text-left transition hover:bg-amber-50 ${
                  n.read_at ? "bg-transparent" : "bg-amber-50/60"
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-red-500" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <SupportChatSheet
        issueId={chatIssueId}
        open={chatOpen}
        onOpenChange={(v) => {
          setChatOpen(v);
          if (!v) refreshCount();
        }}
      />
    </>
  );
}
