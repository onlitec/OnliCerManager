import { describe, it, expect } from "vitest";
import winston from "winston";
import { Writable } from "node:stream";

// Mirrors the serializeErrors format in logger.ts. Kept as a focused unit test
// because instantiating the real logger pulls in Electron's `app`.
const serializeErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      (info as Record<string, unknown>)[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
  }
  return info;
});

function capture(meta: Record<string, unknown>): string {
  let output = "";
  const sink = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  const logger = winston.createLogger({
    format: winston.format.combine(serializeErrors(), winston.format.json()),
    transports: [new winston.transports.Stream({ stream: sink })],
  });
  logger.error("Failed to issue certificate", meta);
  return output;
}

describe("logger error serialisation", () => {
  it("records the message and stack of an Error passed as metadata", () => {
    const line = capture({ error: new TypeError("this.extractField is not a function") });

    // The bug this guards against produced exactly `"error":{}`.
    expect(line).not.toContain('"error":{}');
    expect(line).toContain("this.extractField is not a function");
    expect(line).toContain("TypeError");
  });

  it("leaves non-Error metadata untouched", () => {
    const line = capture({ id: "cert-1", count: 3 });
    expect(line).toContain('"id":"cert-1"');
    expect(line).toContain('"count":3');
  });
});
