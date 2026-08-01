#!/usr/bin/env node
/**
 * Downloads the OpenSSL binaries bundled into the Windows build.
 *
 * Windows has no system OpenSSL, and this app delegates all cryptography to the
 * real binary, so without this the installer would leave users with an app that
 * fails the moment they try to create a CA.
 *
 * The archive is pinned by version *and* SHA-256. If upstream ever serves
 * different bytes for this URL, the hash check fails and the build stops rather
 * than silently shipping an unverified crypto binary.
 *
 * Source: FireDaemon's OpenSSL distribution for Windows, which publishes
 * checksums and permits redistribution under the OpenSSL licence (Apache 2.0).
 * The pinned hash below was verified against the checksum published at
 * https://kb.firedaemon.com/support/solutions/articles/4000121705
 *
 * ── Updating OpenSSL ───────────────────────────────────────────────────────
 * Bundling means users get security fixes only when we ship a release. When a
 * new OpenSSL comes out, bump VERSION and SHA256 together, re-verify the hash
 * against the publisher's page, and cut a release.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const VERSION = "3.5.7";
const SHA256 = "2591459a06a6df2d2e2b23b02a28d7c180b95c02fb4965099a708b7365a74014";
const URL = `https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-${VERSION}.zip`;

// Only what the app needs at runtime: the CLI, the two libraries it links
// against, the default config, and the licence we're required to carry.
const WANTED = [
  { from: "x64/bin/openssl.exe", to: "openssl.exe" },
  { from: "x64/bin/libcrypto-3-x64.dll", to: "libcrypto-3-x64.dll" },
  { from: "x64/bin/libssl-3-x64.dll", to: "libssl-3-x64.dll" },
  { from: "ssl/openssl.cnf", to: "openssl.cnf" },
  { from: "LICENSE.txt", to: "LICENSE.txt" },
];

const repoRoot = path.join(__dirname, "..");
const destDir = path.join(repoRoot, "apps/desktop/resources/openssl/win32");
const cacheDir = path.join(repoRoot, "node_modules/.cache/openssl");
const archive = path.join(cacheDir, `openssl-${VERSION}.zip`);

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function alreadyPresent() {
  return WANTED.every((f) => fs.existsSync(path.join(destDir, f.to)));
}

async function download() {
  fs.mkdirSync(cacheDir, { recursive: true });

  if (fs.existsSync(archive) && sha256(archive) === SHA256) {
    console.log("Using cached archive.");
    return;
  }

  console.log(`Downloading OpenSSL ${VERSION}…`);
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }
  fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()));

  const actual = sha256(archive);
  if (actual !== SHA256) {
    fs.rmSync(archive, { force: true });
    throw new Error(
      `SHA-256 mismatch for openssl-${VERSION}.zip\n` +
        `  expected ${SHA256}\n` +
        `  actual   ${actual}\n` +
        "Refusing to bundle an unverified OpenSSL binary."
    );
  }
  console.log(`SHA-256 verified: ${actual}`);
}

function extract() {
  // bsdtar ships with Windows 10+ and every Linux runner, and reads zip.
  const tar = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  const staging = path.join(cacheDir, "extracted");

  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });

  execFileSync(tar, ["-xf", archive, "-C", staging, ...WANTED.map((f) => f.from)], {
    stdio: "inherit",
  });

  fs.mkdirSync(destDir, { recursive: true });
  for (const file of WANTED) {
    fs.copyFileSync(path.join(staging, file.from), path.join(destDir, file.to));
  }
  fs.rmSync(staging, { recursive: true, force: true });
}

async function main() {
  if (process.platform !== "win32" && !process.env.FORCE_FETCH_OPENSSL) {
    console.log("Not Windows — skipping (set FORCE_FETCH_OPENSSL=1 to override).");
    return;
  }

  if (alreadyPresent() && !process.env.FORCE_FETCH_OPENSSL) {
    console.log(`OpenSSL already present in ${path.relative(repoRoot, destDir)} — skipping.`);
    return;
  }

  await download();
  extract();

  const version = execFileSync(path.join(destDir, "openssl.exe"), ["version"], {
    encoding: "utf8",
    env: { ...process.env, OPENSSL_CONF: path.join(destDir, "openssl.cnf") },
  }).trim();

  console.log(`Bundled: ${version}`);
  console.log(`Location: ${path.relative(repoRoot, destDir)}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
