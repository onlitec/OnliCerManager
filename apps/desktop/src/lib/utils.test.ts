import { describe, it, expect } from "vitest";
import { cn, formatDate, daysUntil } from "./utils";

describe("Desktop UI Utils", () => {
  it("should merge tailwind classes correctly", () => {
    const result = cn("px-2 py-1", "bg-primary", { "text-white": true });
    expect(result).toContain("px-2");
    expect(result).toContain("bg-primary");
    expect(result).toContain("text-white");
  });

  it("should format timestamps into localized date strings", () => {
    const timestamp = 1700000000; // Nov 14, 2023
    const formatted = formatDate(timestamp);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });

  it("should calculate remaining days until expiration timestamp", () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60; // 10 days in future
    const days = daysUntil(futureTimestamp);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(10);
  });
});
