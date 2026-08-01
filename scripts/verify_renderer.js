#!/usr/bin/env node
/**
 * Loads the built renderer in a hidden Electron window and fails if the app
 * does not mount.
 *
 * A renderer that throws during module evaluation produces a window that is
 * simply blank — no crash, no dialog, exit code 0. Nothing in lint, typecheck,
 * the unit tests or the packaging step notices. Version 0.1.6 shipped exactly
 * that: a Node built-in pulled into the browser bundle made Rollup emit a
 * `require` call, which threw before React could render.
 *
 * Must be run through Electron, not plain Node:
 *   electron scripts/verify_renderer.js <path-to-renderer-dist>
 */
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const rendererDist = process.argv[2];
if (!rendererDist || !fs.existsSync(path.join(rendererDist, "index.html"))) {
  console.error(`usage: electron ${path.basename(__filename)} <renderer-dist>`);
  console.error("(no index.html found — build the renderer first)");
  process.exit(2);
}

const MOUNT_TIMEOUT_MS = 15_000;
const consoleErrors = [];

function finish(ok, reason) {
  if (ok) {
    console.log(`\nRenderer mounted successfully. ${reason}`);
  } else {
    console.error(`\nRenderer did NOT mount: ${reason}`);
    if (consoleErrors.length > 0) {
      console.error("\nConsole errors:");
      for (const line of consoleErrors) console.error(`  ${line}`);
    }
  }
  app.exit(ok ? 0 : 1);
}

app.on("ready", async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(rendererDist, "..", "dist-electron", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    // 2 = warning, 3 = error
    if (level >= 3) consoleErrors.push(`${message} (${sourceId}:${line})`);
  });
  win.webContents.on("did-fail-load", (_event, code, desc) => {
    finish(false, `did-fail-load ${code} ${desc}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    finish(false, `render process gone: ${details.reason}`);
  });

  try {
    await win.loadFile(path.join(rendererDist, "index.html"));
  } catch (error) {
    finish(false, `loadFile threw: ${error.message}`);
    return;
  }

  // Poll rather than sleeping a fixed amount: mounting is usually instant, and
  // a slow CI runner shouldn't turn into a false failure.
  const deadline = Date.now() + MOUNT_TIMEOUT_MS;
  for (;;) {
    const length = await win.webContents
      .executeJavaScript("document.getElementById('root')?.innerHTML.length ?? -1")
      .catch(() => -1);

    if (typeof length === "number" && length > 0) {
      finish(true, `#root contains ${length} characters of markup.`);
      return;
    }
    if (Date.now() > deadline) {
      finish(false, `#root stayed empty for ${MOUNT_TIMEOUT_MS / 1000}s (blank window).`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
});
