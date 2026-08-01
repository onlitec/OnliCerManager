#!/usr/bin/env node
/**
 * Rebuilds the native modules that have to run inside Electron.
 *
 * Why not `electron-builder install-app-deps`: that rebuilds *every* native
 * module it finds, which includes `cpu-features` — an optional ssh2 dependency
 * that has no prebuilt binary and needs a full MSVC toolchain to compile. It
 * fails on a stock Windows GitHub runner (node-gyp 9 cannot detect VS 2022) and
 * on most contributors' machines, and because @electron/rebuild treats that as
 * fatal, it takes the whole build down with it.
 *
 * ssh2 works fine without cpu-features — it is a CPU feature-detection
 * optimisation, not a requirement — so we rebuild only what actually matters.
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

// The modules that must match Electron's ABI. better-sqlite3 is loaded by the
// main process on startup; anything added here should be too.
const MODULES = ["better-sqlite3"];

const repoRoot = path.join(__dirname, "..");

function resolveElectronVersion() {
  try {
    // The installed version, not the semver range in package.json — the ABI
    // depends on what is actually on disk.
    return require(path.join(repoRoot, "apps/desktop/node_modules/electron/package.json")).version;
  } catch {
    console.error(
      "Could not resolve the installed Electron version.\n" +
        "Run `pnpm install` first."
    );
    process.exit(1);
  }
}

function resolveRebuildCli() {
  try {
    return require.resolve("@electron/rebuild/lib/cli.js", { paths: [repoRoot] });
  } catch {
    console.error(
      "@electron/rebuild is not installed.\n" +
        "Run `pnpm install` at the repository root first."
    );
    process.exit(1);
  }
}

const electronVersion = resolveElectronVersion();
console.log(`Rebuilding for Electron ${electronVersion}: ${MODULES.join(", ")}`);

try {
  execFileSync(
    process.execPath,
    [
      resolveRebuildCli(),
      "--version",
      electronVersion,
      "--only",
      MODULES.join(","),
      // Scan from the repo root: in this pnpm workspace the native modules are
      // dependencies of packages/infrastructure, not of apps/desktop.
      "--module-dir",
      repoRoot,
    ],
    { stdio: "inherit", cwd: repoRoot }
  );
} catch {
  console.error("\nNative module rebuild failed.");
  process.exit(1);
}

console.log("Native modules rebuilt against Electron.");
