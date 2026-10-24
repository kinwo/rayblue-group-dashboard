"use client";

import { createContext, useContext, useInsertionEffect, type ReactNode } from "react";

declare global {
  // Read by get-nonce, which react-remove-scroll (Radix Dialog, Select) uses for its <style>.
  var __webpack_nonce__: string | undefined;
}

const NonceContext = createContext<string | undefined>(undefined);

/**
 * Hands the request's CSP nonce to client code that injects <style> elements
 * at runtime, so the nonce-based style-src allows them (AC-SEC-4).
 */
export function NonceProvider({ nonce, children }: { nonce: string | undefined; children: ReactNode }) {
  useInsertionEffect(() => {
    globalThis.__webpack_nonce__ = nonce;
  }, [nonce]);
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/** The CSP nonce for a component that renders its own <style> element. */
export function useNonce(): string | undefined {
  return useContext(NonceContext);
}
