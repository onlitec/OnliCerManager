import { test, expect, _electron as electron } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Drives the built app through its real IPC bridge.
 *
 * Deliberately not clicking through the UI: the failures worth guarding against
 * live in the main process and in packaging, and selector-driven tests are
 * fragile enough that they get disabled the first time a label changes. Calling
 * `window.electron.invoke` exercises the same path a click does — preload,
 * contextBridge, ipcMain handler, services, OpenSSL, SQLite — without depending
 * on the markup.
 */

const CA_PASSWORD = "e2e-test-password";
const COMMON_NAME = "e2e.example.test";

let app: ElectronApplication;
let page: Page;
let userDataDir: string;

/**
 * Path to the packaged binary.
 *
 * The tests run against the packaged app rather than dist-electron/main.js:
 * that is the artefact users actually receive, and several of the failures
 * being guarded here exist only once packaged — the manual lives inside an asar
 * archive, and native modules resolve through electron-builder's bundling
 * rather than pnpm's isolated node_modules.
 */
function packagedBinary(): string {
  const releaseDir = join(__dirname, "..", "dist-release");
  return process.platform === "win32"
    ? join(releaseDir, "win-unpacked", "OnliCert Manager.exe")
    : join(releaseDir, "linux-unpacked", "onlicert-manager");
}

test.beforeAll(async () => {
  const executablePath = packagedBinary();
  if (!existsSync(executablePath)) {
    throw new Error(
      `Packaged app not found at ${executablePath}.\n` +
        "Run `pnpm --filter desktop build` before the e2e tests."
    );
  }

  // A throwaway userData directory. Without this the tests would create a CA in
  // the developer's own profile, next to their real certificates.
  userDataDir = mkdtempSync(join(tmpdir(), "onlicert-e2e-"));

  app = await electron.launch({
    executablePath,
    args: [
      `--user-data-dir=${userDataDir}`,
      // GitHub runners have no configured SUID sandbox helper; Electron aborts
      // rather than dropping it silently.
      ...(process.platform === "linux" ? ["--no-sandbox"] : []),
    ],
  });

  page = await app.firstWindow();

  // firstWindow() resolves as soon as the BrowserWindow exists, which is before
  // the bundle has evaluated. Every test below assumes a mounted app.
  await page.waitForFunction(
    () => (document.getElementById("root")?.innerHTML.length ?? 0) > 0,
    undefined,
    { timeout: 30_000 }
  );
});

test.afterAll(async () => {
  await app?.close();
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});

/** Calls an IPC channel from the renderer, exactly as the UI does. */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ([c, a]) => window.electron.invoke(c as never, ...(a as unknown[])),
    [channel, args] as const
  ) as Promise<T>;
}

test("the window renders", async () => {
  // Guards the 0.1.6 blank window: a renderer that throws while loading leaves
  // an empty #root and no crash.
  const markup = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
  expect(markup).toBeGreaterThan(0);
});

test("the manual resolves to a path outside the asar archive", async () => {
  // Guards 0.1.7: the manual lives inside app.asar, which the OS cannot open,
  // so it has to be extracted first.
  const path = await invoke<string | null>("help:get-manual-path");

  expect(path).not.toBeNull();
  expect(path).not.toContain("app.asar" + (process.platform === "win32" ? "\\" : "/"));
  // Checked from the test process, which has no asar support — the same view
  // the operating system has.
  expect(existsSync(path!)).toBe(true);
  expect(statSync(path!).size).toBeGreaterThan(1000);
});

test("a CA can be created", async () => {
  const result = await invoke<{ success: boolean; error?: string }>("ca:create", {
    name: "E2E Root CA",
    commonName: "E2E Root CA",
    algorithm: "RSA_2048",
    validityDays: 3650,
    password: CA_PASSWORD,
  });

  expect(result.error).toBeUndefined();
  expect(result.success).toBe(true);
});

test("a certificate can be issued", async () => {
  // Guards 0.1.7: the IPC adapter passed X509Command.parseMetadata detached from
  // its class, so issuance died on "this.extractField is not a function" after
  // the certificate had already been generated.
  const result = await invoke<{ success: boolean; error?: string }>(
    "cert:create",
    {
      name: "E2E Certificate",
      type: "server",
      commonName: COMMON_NAME,
      san: [],
      validityDays: 365,
      algorithm: "RSA_2048",
    },
    CA_PASSWORD
  );

  expect(result.error).toBeUndefined();
  expect(result.success).toBe(true);
});

test("the issued certificate carries its Common Name in the SAN list", async () => {
  // Guards 0.1.6: browsers verify the hostname against SAN only, so a
  // certificate without its CN there is rejected however valid it looks.
  const certs = await invoke<{ commonName: string; san: string[] }[]>("cert:list");
  const cert = certs.find((c) => c.commonName === COMMON_NAME);

  expect(cert).toBeDefined();
  expect(cert!.san).toContain(`DNS:${COMMON_NAME}`);
});

test("deploying with the wrong password fails before anything is sent", async () => {
  // Guards 0.1.9: the encrypted key used to be written to servers verbatim.
  // A bad password must be rejected at decryption, not turned into a corrupt
  // file on a remote host.
  const server = await invoke<{ success: boolean; server?: { id: string } }>("server:create", {
    name: "E2E Unreachable",
    type: "nginx",
    host: "127.0.0.1",
    port: 22,
    config: { host: "127.0.0.1", port: 22, username: "nobody", password: "nobody" },
  });
  expect(server.success).toBe(true);

  const certs = await invoke<{ id: string; commonName: string }[]>("cert:list");
  const cert = certs.find((c) => c.commonName === COMMON_NAME);
  expect(cert).toBeDefined();

  const result = await invoke<{ success: boolean; message: string }>(
    "server:deploy",
    server.server!.id,
    cert!.id,
    "definitely-not-the-password"
  );

  expect(result.success).toBe(false);
  expect(result.message).toContain("Senha incorreta");
});
