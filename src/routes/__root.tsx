import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { syncClientLanguage } from "@/i18n";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { SubscriptionGateProvider } from "@/lib/subscription-gate";
import { TopNav } from "@/components/TopNav";
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
      { title: "AMYRAX" },
      { name: "description", content: "AMYRAX is a mobile-first web app for discovering gourmet cookies and subscribing to monthly deliveries." },
      { name: "author", content: "AMYRAX" },
      { property: "og:title", content: "AMYRAX" },
      { property: "og:description", content: "AMYRAX is a mobile-first web app for discovering gourmet cookies and subscribing to monthly deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@AMYRAX" },
      { name: "twitter:title", content: "AMYRAX" },
      { name: "twitter:description", content: "AMYRAX is a mobile-first web app for discovering gourmet cookies and subscribing to monthly deliveries." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/28c1c646-c215-4281-81d7-564895597844/id-preview-914e7d7b--d99974e1-204d-46a0-816a-e2595eaf444a.lovable.app-1780805982542.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/28c1c646-c215-4281-81d7-564895597844/id-preview-914e7d7b--d99974e1-204d-46a0-816a-e2595eaf444a.lovable.app-1780805982542.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

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
              <PreDrawCountdownBanner />
              <TopNav />
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </div>
            <PushNotificationOptIn />
            <Toaster position="top-center" richColors />
          </CartProvider>
        </SubscriptionGateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
