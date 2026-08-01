#!/usr/bin/env node
/**
 * Smoke test for a packaged build: confirms the native addons actually load
 * under the bundled Electron runtime.
 *
 * `npmRebuild` is disabled in electron-builder.yml, so nothing rebuilds
 * better-sqlite3 against Electron's ABI during packaging. If the installed
 * binary is incompatible, the app builds and installs cleanly and then fails
 * the moment it opens the database — which is the first thing it does. Run
 * this before publishing so that failure surfaces in CI instead of on a user's
 * machine.
 *
 * Must be run through Electron, not plain Node:
 *   ELECTRON_RUN_AS_NODE=1 <packaged-binary> scripts/verify_native_modules.js <unpacked-dir>
 */
const path = require("path");
const fs = require("fs");

const unpackedDir = process.argv[2];
if (!unpackedDir) {
  console.error("usage: verify_native_modules.js <unpacked-app-dir>");
  process.exit(2);
}

const addons = [
  "resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
];

console.log(`electron ${process.versions.electron ?? "?"} | node ABI ${process.versions.modules}`);

let failed = 0;
for (const relative of addons) {
  const addonPath = path.join(unpackedDir, relative);
  if (!fs.existsSync(addonPath)) {
    console.error(`MISSING  ${relative}`);
    failed++;
    continue;
  }
  try {
    process.dlopen({ exports: {} }, addonPath);
    console.log(`ok       ${path.basename(relative)}`);
  } catch (error) {
    console.error(`FAILED   ${relative}`);
    // Print the whole message: the ABI mismatch explanation ("compiled against
    // a different Node.js version using NODE_MODULE_VERSION ...") is on the
    // continuation lines, so truncating to the first line hides the cause.
    for (const line of String(error.message).split("\n")) {
      console.error(`         ${line}`);
    }
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} native module(s) will not load under Electron — do not publish this build.`);
  process.exit(1);
}
console.log("\nAll native modules load under the packaged Electron runtime.");
