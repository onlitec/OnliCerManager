import winston from "winston";
import { app } from "electron";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";

function getLogDir(): string {
  try {
    if (app) {
      return join(app.getPath("userData"), "logs");
    }
  } catch {
    // Fallback if app.getPath is unavailable
  }
  return join(tmpdir(), "onlicert-logs");
}

const logDir = getLogDir();

try {
  mkdirSync(logDir, { recursive: true });
} catch {
  // Ignore fallback if already exists
}

export const logger = winston.createLogger({
  level: process.env["NODE_ENV"] === "development" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
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
