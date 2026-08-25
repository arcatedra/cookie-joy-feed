/**
 * Guarded PWA service-worker registration.
 *
 * The service worker is ONLY registered in real production (the published
 * app on hazorex.com / hazorex.lovable.app). It is never registered in:
 *   - dev (`import.meta.env.PROD` is false)
 *   - the Lovable editor preview iframe
 *   - preview hosts (`id-preview--*`, `preview--*`)
 *   - staging hosts (`*.lovableproject.com`, `*.lovableproject-dev.com`,
 *     `*.beta.lovable.dev`)
 *   - any request with `?sw=off` (manual kill switch)
 *
 * In every refused context we proactively unregister any matching `/sw.js`
 * registration so a stale worker from a previous published build cannot
 * serve cached content inside the editor.
 */

const SW_URL = "/sw.js";

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin blocked — treat as iframe to be safe
  }
}

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return true;
  if (inIframe()) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;

  const params = new URLSearchParams(window.location.search);
  if (params.get("sw") === "off") return true;

  return false;
}

/** Unregister any service worker whose scope is this origin (the app SW). */
async function unregisterAppWorkers(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => r.scope.startsWith(window.location.origin + "/"))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

let controllerListenerAttached = false;

/**
 * Register the PWA service worker if the current context allows it.
 * Safe to call multiple times. No-op (and unregisters stale workers) in
 * preview/dev/iframe contexts.
 */
export async function registerPwaServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    await unregisterAppWorkers();
    return;
  }

  // On a new SW taking control (new deploy), reload once so the page picks
  // up the new precached assets. Skipped on first install (no prior
  // controller) to avoid an extra reload for first-time visitors.
  if (!controllerListenerAttached) {
    controllerListenerAttached = true;
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    });
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("PWA service worker registration failed", err);
  }
}
