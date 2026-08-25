/// <reference lib="webworker" />
// Unified Hazorex service worker (vite-plugin-pwa, injectManifest strategy).
// Responsibilities:
//   1. Precache the hashed app shell (JS/CSS/HTML/fonts/icons) for offline use.
//   2. NetworkFirst for HTML navigations -> fresh online, cached offline.
//   3. CacheFirst runtime cache for same-origin images viewed previously.
//   4. Web push notifications (migrated from the old public/sw.js).
//
// This file is compiled by vite-plugin-pwa into a single /sw.js bundle. It is
// NOT registered in Lovable preview/dev/iframe — see src/lib/pwa-register.ts.
//
// IMPORTANT: workbox-build searches the compiled output for the literal token
// `self.__WB_MANIFEST` to inject the precache list. Always reference that
// property as `self.__WB_MANIFEST` (type casts are erased, the literal stays).

import { skipWaiting, clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  type PrecacheEntry,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// Minimal typed view of the ServiceWorkerGlobalScope. The project tsconfig
// does not include the "WebWorker" lib, so we cast `self` to this interface.
// vite-plugin-pwa transpiles this file (types are erased) at build time.
interface SWGlobalScope {
  __WB_MANIFEST: PrecacheEntry[];
  location: Location;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  addEventListener(type: string, listener: (event: unknown) => void): void;
}
const scope = self as unknown as SWGlobalScope;

// Take control immediately on install/update (autoUpdate flow).
skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precache the app shell manifest injected by vite-plugin-pwa at build time.
// The literal `self.__WB_MANIFEST` below is what workbox-build replaces.
precacheAndRoute((self as unknown as { __WB_MANIFEST: PrecacheEntry[] }).__WB_MANIFEST);

// HTML navigations: NetworkFirst so users get fresh content online and a
// cached copy when offline. Each visited route's HTML is cached here.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "hazorex-html",
    networkTimeoutSeconds: 3,
  }),
);

// Same-origin images (hashed product/reel assets): CacheFirst runtime cache
// so previously viewed images load offline. Excluded from precache to keep
// the install payload small.
registerRoute(
  ({ request, url }) =>
    request.destination === "image" && url.origin === scope.location.origin,
  new CacheFirst({
    cacheName: "hazorex-imgs",
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 86400 }),
    ],
  }),
);

// --- Web push notifications (migrated from public/sw.js) ---

scope.addEventListener("push", (eventObj: unknown) => {
  const event = eventObj as PushEvent;
  let data: Record<string, string> = {};
  try {
    data = event.data ? (event.data.json() as Record<string, string>) : {};
  } catch (_) {
    data = { title: "HAZOREX", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "HAZOREX";
  // `renotify` is a valid web Notification option but is not in the DOM
  // `NotificationOptions` type, so the options object is kept untyped.
  const options: Record<string, unknown> = {
    body: data.body || "Tienes una novedad en HAZOREX.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || "hazorex",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    scope.registration.showNotification(
      title,
      options as unknown as NotificationOptions,
    ),
  );
});

scope.addEventListener("notificationclick", (eventObj: unknown) => {
  const event = eventObj as NotificationEvent;
  event.notification.close();
  const targetUrl =
    (event.notification.data && (event.notification.data as { url?: string }).url) ||
    "/";

  event.waitUntil(
    (async () => {
      const clientList = await scope.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        const win = client as WindowClient;
        if ("focus" in win) {
          win.navigate(targetUrl);
          return win.focus();
        }
      }
      if (scope.clients.openWindow) return scope.clients.openWindow(targetUrl);
    })(),
  );
});
