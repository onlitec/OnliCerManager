#!/usr/bin/env node
// Thin launcher: resolves the Electron binary from the desktop app and runs
// verify_renderer.js inside it, so `pnpm verify:renderer` works from anywhere.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const desktop = path.join(repoRoot, "apps/desktop");

let electronBinary;
try {
  // `electron`'s main export is the path to its binary when required from Node.
  electronBinary = require(require.resolve("electron", { paths: [desktop] }));
} catch {
  console.error("Electron is not installed. Run `pnpm install` first.");
  process.exit(2);
}

// Chromium's SUID sandbox helper isn't set up on CI runners, and Electron
// aborts rather than silently dropping it. This flag applies to *this
// verification process only* — the packaged app still sets `sandbox: true` in
// its webPreferences, which is what actually protects users.
const sandboxFlags = process.platform === "linux" ? ["--no-sandbox"] : [];

try {
  execFileSync(
    electronBinary,
    [...sandboxFlags, path.join(repoRoot, "scripts/verify_renderer.js")],
    {
      stdio: "inherit",
      cwd: desktop,
      // Passed through the environment so Chromium flags can't shift it.
      env: { ...process.env, ONLICERT_RENDERER_DIST: path.join(desktop, "dist") },
    }
  );
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
