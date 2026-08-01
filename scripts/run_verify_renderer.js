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

try {
  execFileSync(
    electronBinary,
    [path.join(repoRoot, "scripts/verify_renderer.js"), path.join(desktop, "dist")],
    { stdio: "inherit", cwd: desktop }
  );
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
