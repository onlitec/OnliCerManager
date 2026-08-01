/**
 * UUID generator that works in every environment this package runs in.
 *
 * `packages/core` must not depend on Node built-ins: it is bundled into the
 * Electron renderer as well as the main process. Importing `node:crypto` here
 * made Rollup emit `const r = require, c = r("crypto")` into the renderer
 * bundle, which threw `ReferenceError: require is not defined` before React
 * could mount — the whole window came up blank.
 *
 * The Web Crypto API is standard in browsers and in Node 19+, so no import is
 * needed. It is described structurally rather than via the DOM `Crypto` type,
 * because this package's tsconfig deliberately includes neither DOM nor Node
 * type definitions.
 */
interface WebCryptoLike {
  randomUUID?: () => string;
  getRandomValues?: <T extends Uint8Array>(array: T) => T;
}

export function randomId(): string {
  const webCrypto = (globalThis as { crypto?: WebCryptoLike }).crypto;

  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === "function") {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    // RFC 4122 version 4 / variant 10xx
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error("No secure random source available to generate an identifier.");
}
