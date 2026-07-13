import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import faviconAsset from "@/assets/hazorex-favicon.png.asset.json";
import appleTouchAsset from "@/assets/hazorex-apple-touch.png.asset.json";
import logoAsset from "@/assets/hazorex-logo-original.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { syncClientLanguage } from "@/i18n";
import { CspNonceProvider } from "@/lib/csp-nonce-context";
import { getCspNonce } from "@/lib/csp-nonce";

/**
 * Read the per-request CSP nonce. On the server it comes from
 * AsyncLocalStorage seeded by the security-headers middleware. On the
 * client we read it from the `<meta name="csp-nonce">` tag that RootShell
 * emits during SSR so post-hydration renders of inline `<style>` blocks
 * still carry the correct nonce.
 */
const readCspNonce = createIsomorphicFn()
  .client((): string | undefined => {
    if (typeof document === "undefined") return undefined;
    return (
      document
        .querySelector('meta[name="csp-nonce"]')
        ?.getAttribute("content") ?? undefined
    );
  })
  .server((): string | undefined => getCspNonce());
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { SubscriptionGateProvider } from "@/lib/subscription-gate";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PreDrawCountdownBanner } from "@/components/PreDrawCountdownBanner";
import { PushNotificationOptIn } from "@/components/PushNotificationOptIn";
import { Toaster } from "sonner";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.pageNotFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.pageNotFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.didNotLoadTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.didNotLoadDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hazorex" },
      { name: "description", content: "Hazorex — la plataforma para descubrir, comprar y participar en experiencias premium." },
      { name: "author", content: "Hazorex" },
      { property: "og:site_name", content: "Hazorex" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://hazorex.com${logoAsset.url}` },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: `https://hazorex.com${logoAsset.url}` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: faviconAsset.url },
      { rel: "apple-touch-icon", sizes: "180x180", href: appleTouchAsset.url },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const nonce = readCspNonce();
  return (
    <html lang="es">
      <head>
        {nonce ? <meta name="csp-nonce" content={nonce} /> : null}
        <HeadContent />
      </head>
      <body>
        <CspNonceProvider nonce={nonce}>{children}</CspNonceProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nonce = readCspNonce();
  // /repartidor and /repartidor/* use their own DriverLayout. /repartidores (marketing) keeps store chrome.
  const isDriverZone =
    pathname === "/repartidor" || pathname.startsWith("/repartidor/");

  useEffect(() => {
    // Defer past hydration commit to avoid SSR/CSR text mismatch.
    const id = window.setTimeout(() => syncClientLanguage(), 0);
    return () => window.clearTimeout(id);
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionGateProvider>
          <CartProvider>
            <div className="min-h-screen bg-background">
              {!isDriverZone && <PreDrawCountdownBanner />}
              {!isDriverZone && <TopNav />}
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
              {!isDriverZone && <SiteFooter />}
            </div>
            {!isDriverZone && <PushNotificationOptIn />}
            {/* Sonner injects a runtime <style> block — passing `nonce` lets it pass CSP. */}
            <Toaster position="top-center" richColors {...(nonce ? { nonce } : {})} />
          </CartProvider>
        </SubscriptionGateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
