import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped storage for the per-request CSP nonce. The security-headers
 * middleware seeds this at the top of the request; `getRouter()` reads it so
 * TanStack Router can stamp every inline script it emits with the same nonce
 * that appears in the `Content-Security-Policy` header.
 *
 * We share the value through AsyncLocalStorage instead of a response
 * transport header because response headers set by inner handlers via h3's
 * `setResponseHeader` are not visible on the intermediate `Response` that
 * request middleware wraps — they get merged onto the final outgoing
 * response later, too late for the CSP header to reference them.
 */
const store = new AsyncLocalStorage<string>();

export function runWithCspNonce<T>(nonce: string, fn: () => T): T {
  return store.run(nonce, fn);
}

export function getCspNonce(): string | undefined {
  return store.getStore();
}

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
