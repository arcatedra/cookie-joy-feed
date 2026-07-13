import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";

/**
 * Read the per-request CSP nonce that the security-headers middleware
 * seeded into AsyncLocalStorage. On the client this returns undefined
 * and the server import is stripped from the client bundle via
 * `createIsomorphicFn`.
 */
const readCspNonce = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server((): string | undefined => {
    // Imported lazily inside the server branch so the module never
    // reaches the client bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCspNonce } = require("./lib/csp-nonce") as typeof import("./lib/csp-nonce");
    return getCspNonce();
  });

export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = readCspNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
