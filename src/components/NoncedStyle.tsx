import type { HTMLAttributes } from "react";
import { useCspNonce } from "@/lib/csp-nonce-context";

/**
 * Drop-in replacement for `<style>` that stamps the per-request CSP nonce.
 * Lets us keep inline `<style>` blocks in the codebase after removing
 * `'unsafe-inline'` from the CSP `style-src` directive.
 */
export function NoncedStyle(props: HTMLAttributes<HTMLStyleElement>) {
  const nonce = useCspNonce();
  return <style nonce={nonce} {...props} />;
}
