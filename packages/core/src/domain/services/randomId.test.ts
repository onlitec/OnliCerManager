import { describe, it, expect } from "vitest";
import { randomId } from "./randomId";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomId", () => {
  it("returns a v4 UUID", () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomId()));
    expect(ids.size).toBe(500);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    const original = globalThis.crypto;
    const stub = {
      getRandomValues: original.getRandomValues.bind(original),
    };
    Object.defineProperty(globalThis, "crypto", { value: stub, configurable: true });

    try {
      expect(randomId()).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });
});
