import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { routeTree } from "./routeTree.gen";

const NONCE_TRANSPORT_HEADER = "x-csp-nonce";

/**
 * Generate a fresh CSP nonce for each SSR render and propagate it to the
 * security-headers request middleware via a temporary response header. On
 * the client this function returns `undefined` and the server import is
 * stripped from the client bundle by `createIsomorphicFn`.
 */
const generateAndAttachNonce = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server((): string | undefined => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const nonce = btoa(bin);
    try {
      setResponseHeader(NONCE_TRANSPORT_HEADER, nonce);
    } catch {
      // Outside a live server request context (e.g. build-time warmups)
      // there is no response to write to. The CSP header won't reference
      // this nonce either, so it's safe to no-op.
    }
    return nonce;
  });

export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = generateAndAttachNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
