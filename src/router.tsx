import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setResponseHeader } from "@tanstack/react-start/server";
import { routeTree } from "./routeTree.gen";

const NONCE_TRANSPORT_HEADER = "x-csp-nonce";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Generate a fresh CSP nonce for every SSR request and propagate it back
  // to the security-headers request middleware via a temporary response
  // header. The middleware injects the nonce into the CSP `script-src`
  // directive and strips the transport header before responding. On the
  // client `typeof window !== "undefined"`, so this branch is skipped and
  // no nonce is set — hydration reuses the server-rendered <script nonce>
  // attributes.
  let nonce: string | undefined;
  if (typeof window === "undefined") {
    nonce = generateNonce();
    try {
      setResponseHeader(NONCE_TRANSPORT_HEADER, nonce);
    } catch {
      // Outside a server-request context (e.g. build-time prerender warmups)
      // there is no response to write to — the CSP won't reference this
      // nonce either, so it's safe to skip.
    }
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
