# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OnliCert Manager is an open-source Electron desktop app (Windows/Linux/macOS) for managing a local Certificate Authority: creating a CA, issuing certificates, deploying them to servers (Proxmox, MikroTik, Nginx, Apache, Traefik, Docker, TrueNAS, Samba, generic Linux/SSH), and tracking renewals. Everything runs locally — no cloud, no accounts. All cryptography is delegated to the real OpenSSL CLI binary (never reimplemented in JS/TS).

## Commands

Run from the repo root unless noted. This is a pnpm workspace (`pnpm@9`, Node `>=20`).

```bash
pnpm install                 # install all workspace deps
pnpm dev                     # run the desktop app in dev mode (Vite + Electron)
pnpm build                   # build the desktop app (renderer + electron + installer)
pnpm lint                    # eslint across all packages
pnpm lint:fix
pnpm typecheck               # tsc --noEmit across all packages
pnpm test                    # vitest run across all packages
pnpm format                  # prettier --write
```

Scoped to a single package/app with `pnpm --filter <name> <script>`, e.g.:

```bash
pnpm --filter desktop dev
pnpm --filter @onlicert/infrastructure test
pnpm --filter @onlicert/core typecheck
```

Run a single test file/case with vitest directly (each package has its own `vitest.config.ts`):

```bash
cd packages/infrastructure && pnpm vitest run src/openssl/openssl.test.ts
cd packages/infrastructure && pnpm vitest run -t "encrypts and decrypts"
```

`apps/desktop` also has `test:e2e` (`playwright test`) in `package.json`, but no Playwright config currently exists in the repo — treat e2e as not yet wired up rather than assuming it runs.

Infrastructure package tests spawn the real OpenSSL binary (see `openssl.test.ts`, `database.test.ts`) — OpenSSL must be installed and on PATH on every platform (CI installs it via `apt-get install openssl` on Linux; on Windows it comes from Git for Windows or a separate install).

CI (`.github/workflows/ci.yml`) runs, in order: lint+typecheck → unit tests → build (renderer + electron compile) on ubuntu and windows. Match this locally before pushing.

## Architecture

Monorepo, Clean Architecture, three layers plus a plugin system:

```
apps/desktop/           Electron + React 19 + Vite (the only app)
  electron/              main process: main.ts, preload.ts, ipc/*.ipc.ts, logger.ts
  src/                    renderer: pages/, components/, hooks/, providers/, i18n/
packages/core/           domain layer — entities, value objects, application services. No Electron/Node deps.
packages/infrastructure/ infra layer — OpenSSL wrapper, SQLite repos, AES-256 encryption, plugin registry, built-in SSH-based plugins
packages/plugins/
  plugin-interface/       IPlugin contract shared by all deployment plugins
  proxmox/, mikrotik/     concrete plugin implementations
```

Dependency direction: `plugins/* → plugin-interface`, `infrastructure → core + plugin-interface`, `apps/desktop → core + infrastructure + plugin-interface + plugin-*`. `core` and `plugin-interface` have no dependency on `infrastructure` or Electron — keep it that way.

### Electron process boundary

- `electron/main.ts` creates the `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and calls `setupAllIpcHandlers()` on `app.whenReady()`.
- `electron/preload.ts` exposes a single `window.electron` object via `contextBridge`, restricted to a hardcoded union type of IPC channel names (`IpcChannel`). **Adding a new IPC call means adding the channel name to this union in `preload.ts`, not just registering the handler in main.** The renderer never gets direct Node/Electron access.
- `electron/ipc/*.ipc.ts` — one file per domain (`ca.ipc.ts`, `certificates.ipc.ts`, `servers.ipc.ts`, `help.ipc.ts`), each exporting a `setup*IpcHandlers()` function called from `electron/ipc/index.ts`. Handlers construct their own repositories/services from `@onlicert/infrastructure` per call (e.g. `DatabaseConnection.getInstance(app.getPath("userData"))`), catch errors, log via the shared Winston `logger`, and return `{ success, ... }`-shaped results rather than throwing across the IPC boundary (exception: read-only list handlers that let errors propagate).

### OpenSSL wrapper (`packages/infrastructure/src/openssl`)

- `OpenSSLBinary.resolve()` looks for a bundled `<resourcesPath>/openssl/win32/openssl.exe` on Windows first, then falls back to the system PATH. Since 0.1.4 the Windows build **does** bundle OpenSSL: `scripts/fetch_openssl_windows.js` fetches it at build time (pinned by version + SHA-256, never committed — `apps/desktop/resources/openssl` is gitignored) and electron-builder ships it via `extraResources`. Linux uses the system binary on purpose, so distro security updates apply.
- The bundled Windows build has an `OPENSSLDIR` compiled in that points at the packager's machine, so `OpenSSLWrapper` sets `OPENSSL_CONF` to the shipped `openssl.cnf` — but only when the bundled binary is in use. Without it `version` and `genrsa` work while `req`/`ca` fail, i.e. it looks healthy until you try to issue a certificate.
- **Never pass these commands' static methods as bare references** (`parseMetadata: X509Command.parseMetadata`). Several reach for `this` internally; detaching them broke certificate issuance in every release up to 0.1.4. The `@typescript-eslint/unbound-method` rule guards this — do not re-add `ignoreStatic: true`.
- `OpenSSLWrapper.run()`/`runOrThrow()` always `spawn()` with `shell: false` and an explicit args array — never build a shell command string. Preserve this when adding new OpenSSL operations.
- `commands/*Command.ts` (`GenKeyCommand`, `ReqCommand`, `X509Command`, `CACommand`, `VerifyCommand`, `PKCS12Command`) wrap specific OpenSSL subcommands and are the layer application services call into — don't call `OpenSSLWrapper` directly from application/UI code, add a `*Command` instead.

### Database (`packages/infrastructure/src/database`)

- `DatabaseConnection` is a singleton over `better-sqlite3`, WAL mode, DB file at `<userData>/onlicert.db`. Schema changes go through the versioned migration list in `DatabaseConnection.runMigrations` (append a new `{ version, sql }` entry — never edit an already-shipped migration).
- Repositories (`CARepository`, `CertificateRepository`, `ServerRepository`) are the only things that touch the DB directly.
- Private key material (`key_enc` columns) is always stored as `AES256Service.encrypt()` output, never plaintext PEM.

### Encryption (`packages/infrastructure/src/encryption/AES256Service.ts`)

AES-256-GCM with scrypt-derived keys; output is `base64(salt(32) || iv(12) || authTag(16) || ciphertext)`. Used to encrypt private keys at rest under a user-supplied password. Don't change the wire format without a migration path for existing encrypted data in users' databases.

### Plugin system (`packages/infrastructure/src/plugins`, `packages/plugins/*`)

- `IPlugin` (in `@onlicert/plugin-interface`) is the contract: `metadata` (id, name, icon, `configSchema` for auto-generated UI forms), `testConnection()`, `deploy()`, `verify()`.
- `PluginRegistry` (singleton) holds registered plugins by `metadata.id`; `servers.ipc.ts` registers all built-ins on setup: `ProxmoxPlugin`, `MikrotikPlugin` (standalone packages) plus SSH-based presets from `infrastructure/src/plugins/SSHPlugin.ts` (`createCustomSSHPlugin`, `createNginxPlugin`, `createApachePlugin`, `createTraefikPlugin`, `createDockerPlugin`, `createTrueNASPlugin`, `createSambaPlugin`, `createLinuxGenericPlugin`).
- To add a new deployment target: either implement `IPlugin` as a new `packages/plugins/<name>` package (like Proxmox/MikroTik, for API-based targets) or add a `create*Plugin()` factory in `SSHPlugin.ts` (for SSH/SFTP-based targets), then register it in `servers.ipc.ts`.

## Conventions

- TypeScript strict mode repo-wide (`tsconfig.base.json`): `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`. ESLint uses `strictTypeChecked` + `stylisticTypeChecked`; `no-explicit-any` and `no-non-null-assertion` are errors, `consistent-type-imports` is enforced.
- `packages/core` and `packages/plugins/*` (except infra-adjacent ones) are ESM (`"type": "module"`); `packages/infrastructure` and the SSH/API plugins are CommonJS (`"type": "commonjs"`) since they depend on Node natives like `better-sqlite3`/`ssh2`. Match the existing `type` field when adding a package.
- User-facing strings (menus, error messages returned over IPC, UI copy) are Portuguese (pt-BR) by default with i18n via `react-i18next` (`src/i18n/locales/en-US.json`, `pt-BR.json`) for the renderer UI — keep both locale files in sync when adding translatable UI strings.
- Never invoke OpenSSL or any external process through a shell string — always `spawn`/`execFile` with an argument array (see security section in README).
- Logging goes through the shared Winston `logger` (`electron/logger.ts`), writing to `%APPDATA%/@onlicert/desktop/logs` (Electron derives this from package.json `name`, not `productName` — renaming it would strand existing users' CAs, so it needs a migration, not just a rename) — not `console.log`, and not `<install-dir>` (that caused an `EPERM` regression previously, see `PROJECT_HISTORY.md`).
