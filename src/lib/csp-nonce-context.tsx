import { createContext, useContext, type ReactNode } from "react";

/**
 * Client-safe React context that carries the per-request CSP nonce down
 * the tree. RootShell reads the nonce on the server from AsyncLocalStorage,
 * embeds it in a `<meta name="csp-nonce">` tag so the browser can pick it
 * up after hydration, and provides it here for any component that renders
 * an inline `<style>` block. The nonce lets us drop `'unsafe-inline'` from
 * the CSP `style-src` directive entirely.
 */
const CspNonceContext = createContext<string | undefined>(undefined);

export function CspNonceProvider({
  nonce,
  children,
}: {
  nonce: string | undefined;
  children: ReactNode;
}) {
  return (
    <CspNonceContext.Provider value={nonce}>{children}</CspNonceContext.Provider>
  );
}

export function useCspNonce(): string | undefined {
  return useContext(CspNonceContext);
}
