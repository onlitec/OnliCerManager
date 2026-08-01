# Contributing to OnliCert Manager

Thanks for your interest in improving OnliCert Manager. This document covers how to set up the project, the conventions the codebase follows, and how to submit changes.

## Getting set up

```bash
git clone https://github.com/onlitec/OnliCerManager.git
cd OnliCerManager
pnpm install
pnpm dev
```

Requirements: Node.js >= 20, pnpm >= 9, and OpenSSL on `PATH` (Linux/macOS — Windows uses the bundled binary). See the [Build from Source](README.md#build-from-source) section of the README for details.

### Native modules

`better-sqlite3` ships a binary compiled for Node's ABI, but it has to load inside Electron, which uses a different one. If the two don't match, the app starts and then throws the instant it opens its database — the first thing it does. Symptom: an error mentioning `NODE_MODULE_VERSION`.

Fix it with:

```bash
pnpm rebuild:native
```

It rebuilds only the modules that actually have to run inside Electron (currently just `better-sqlite3`), which normally means downloading a prebuilt binary — no C++ toolchain required. It deliberately does *not* use `electron-builder install-app-deps`: that rebuilds every native module it finds, including `cpu-features`, an optional `ssh2` dependency with no prebuilt binary that needs a full MSVC toolchain and fails even on a stock Windows CI runner. `ssh2` works fine without it.

It's a separate step rather than a `postinstall` hook so a failed rebuild can't block `pnpm install` outright. You need it if you hit the error above, or before packaging a release.

The release workflow runs it on CI, then verifies the result with `scripts/verify_native_modules.js`, which loads each addon under the packaged Electron runtime and fails the build if any won't load.

## Project layout

This is a pnpm workspace following Clean Architecture. Before making changes, skim `CLAUDE.md` at the repo root — it documents the architecture, the Electron process boundary, the OpenSSL wrapper, the database/encryption layers, and the plugin system in detail. In short:

```
apps/desktop/           Electron + React 19 + Vite (the only app)
packages/core/           domain layer — no Electron/Node deps
packages/infrastructure/ OpenSSL wrapper, SQLite repos, encryption, plugin registry
packages/plugins/        deployment plugins (Proxmox, MikroTik, plugin-interface)
```

Respect the dependency direction: `core` and `plugin-interface` must never depend on `infrastructure` or Electron.

## Before you submit a change

Run the same checks CI runs, from the repo root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or scoped to the package you touched: `pnpm --filter <name> <script>` (e.g. `pnpm --filter @onlicert/infrastructure test`).

Notes:
- `packages/infrastructure` tests spawn the real OpenSSL binary — make sure it's installed and on `PATH`.
- TypeScript strict mode is enforced repo-wide (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). ESLint uses `strictTypeChecked`; `no-explicit-any` and `no-non-null-assertion` are errors.
- Never invoke OpenSSL or any external process through a shell string — always `spawn`/`execFile` with an explicit argument array.
- Private key material must always go through `AES256Service.encrypt()` before being persisted — never store plaintext PEM.
- Database schema changes go through a new versioned entry in `DatabaseConnection.runMigrations` — never edit an already-shipped migration.
- User-facing strings (UI copy, error messages returned over IPC) are Portuguese (pt-BR) by default via `react-i18next`; keep `src/i18n/locales/en-US.json` and `pt-BR.json` in sync when adding translatable strings.
- Adding a new IPC call requires adding the channel name to the `IpcChannel` union in `apps/desktop/electron/preload.ts`, not just registering the handler.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes, keeping commits focused and descriptive.
3. Make sure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.
4. Open a pull request against `main` describing what changed and why. Reference any related issue.
5. Be responsive to review feedback — small, focused PRs are easier to review and merge.

## Reporting bugs / requesting features

Use [GitHub Issues](https://github.com/onlitec/OnliCerManager/issues). For bugs, include your OS, app version, steps to reproduce, and any relevant log output from `logs/` inside the app's data folder (see [Where your data lives](README.md#where-your-data-lives)).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
