import winston from "winston";
import { app } from "electron";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";

function getLogDir(): string {
  try {
    // Outside a real Electron process, `app` isn't a usable API object
    // (e.g. under Node/test runners), so getPath() throws and we fall back.
    return join(app.getPath("userData"), "logs");
  } catch {
    return join(tmpdir(), "onlicert-logs");
  }
}

const logDir = getLogDir();

try {
  mkdirSync(logDir, { recursive: true });
} catch {
  // Ignore fallback if already exists
}

/**
 * Makes Error objects survive JSON serialisation.
 *
 * `winston.format.errors()` only unwraps an Error passed as the log *message*.
 * Every call site here logs `logger.error("...", { error })`, which puts it in
 * the metadata — and an Error's own properties are non-enumerable, so
 * JSON.stringify turns it into `{}`. Certificate issuance failed five times in
 * a row for a user and the log recorded `"error":{}` each time, which is worse
 * than useless: it looks like something was captured.
 */
const serializeErrors = winston.format((info) => {
  for (const [key, value] of Object.entries(info)) {
    if (value instanceof Error) {
      (info as Record<string, unknown>)[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
        // `cause` is `unknown`; only unwrap shapes that stringify meaningfully.
        ...(value.cause instanceof Error
          ? { cause: `${value.cause.name}: ${value.cause.message}` }
          : typeof value.cause === "string"
            ? { cause: value.cause }
            : {}),
      };
    }
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    serializeErrors(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${String(timestamp)} [${level}]: ${String(message)}${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: join(logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    }),
  ],
});
