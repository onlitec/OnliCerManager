import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests drive the *built* Electron app.
 *
 * Every serious bug this project has shipped was invisible to lint, typecheck
 * and the unit tests, because each one only existed once the app was compiled
 * and running: a static method detached by the IPC layer, a Node built-in
 * bundled into the renderer, a file read from inside an asar archive, an
 * encrypted key written to a server. These tests exercise the real main
 * process through the real IPC bridge.
 *
 * Run `pnpm --filter desktop build:renderer && pnpm --filter desktop build:electron`
 * first — the tests launch dist-electron/main.js, not the sources.
 */
export default defineConfig({
  testDir: "./e2e",
  // Electron launches are slow and these tests share one app instance each.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // A CA keypair is generated per test file; parallel OpenSSL spawns just add
  // contention without shortening the run.
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  forbidOnly: !!process.env.CI,
  retries: 0,
});
