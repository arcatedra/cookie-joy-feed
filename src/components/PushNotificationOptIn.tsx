import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { savePushSubscription, deletePushSubscription } from "@/lib/push.functions";

// Public VAPID key — safe to ship to the browser.
const VAPID_PUBLIC_KEY =
  "BGqy0uJxyDGVA_tyu_TW9l1O28alYCF1aP7OhnbgzHzP4tuC1vcoTk4QTTlkkcGxJwhgk0pS58lcRL_UA6Adsp4";

const DISMISS_KEY = "pre-draw-push-dismissed-at";
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ms = DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - Number(ts) < ms;
  } catch {
    return false;
  }
}

export function PushNotificationOptIn() {
  const { user } = useAuth();
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(deletePushSubscription);

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !isSupported()) return;
    if (Notification.permission !== "default") {
      // Already granted: ensure we have a current subscription registered server-side.
      if (Notification.permission === "granted") void ensureSubscribed();
      return;
    }
    if (isDismissed()) return;
    const t = window.setTimeout(() => setShow(true), 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function ensureSubscribed() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        });
      }
      const json = sub.toJSON();
      await save({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? arrayBufferToBase64Url(sub.getKey("p256dh")),
          auth: json.keys?.auth ?? arrayBufferToBase64Url(sub.getKey("auth")),
          userAgent: navigator.userAgent.slice(0, 500),
        },
      });
    } catch (err) {
      console.warn("ensureSubscribed failed", err);
    }
  }

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso denegado. Puedes activarlo después en los ajustes del navegador.");
        setShow(false);
        return;
      }
      await ensureSubscribed();
      toast.success("¡Listo! Te avisaremos 5 minutos antes del sorteo.");
      setShow(false);
    } catch (err) {
      console.error(err);
      toast.error("No pudimos activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-2xl">
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Aviso 5 minutos antes del sorteo
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Activa las notificaciones del navegador y te avisamos justo antes de que la ruleta gire.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleEnable}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Activando…" : "Activar avisos"}
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
