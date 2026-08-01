<div align="center">

# OnliCert Manager

**Run your own Certificate Authority, without touching the command line.**

Create a local CA, issue TLS certificates, and deploy them to your servers — all from a desktop app.
Everything stays on your machine: no cloud, no accounts, no telemetry.

[![CI](https://github.com/onlitec/OnliCerManager/actions/workflows/ci.yml/badge.svg)](https://github.com/onlitec/OnliCerManager/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)](#download--installation)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

[Download](#download--installation) · [Getting started](#getting-started-first-run) · [Deployment targets](#deployment-targets) · [Build from source](#build-from-source) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why?

Internal services — a Proxmox host, a NAS, a router's web UI, a staging environment — need TLS just like public ones do. But Let's Encrypt can't reach them, and doing it by hand means memorising `openssl req -x509 -newkey rsa:4096 -keyout …` and keeping track of which key belongs to which host and when it expires.

OnliCert Manager gives you a real internal CA with a UI: issue a certificate in a few fields, push it to the target server, and see what's about to expire before it breaks.

All cryptography is delegated to the actual **OpenSSL binary** — nothing is reimplemented in JavaScript.

## Features

- **Local Certificate Authority** — create a root CA with RSA (2048/4096) or ECC (P-256/P-384/P-521), and export its public certificate as a `.crt` to install on client machines.
- **Certificate issuance** — server, client, VPN, code-signing, e-mail and web-server profiles, with Subject Alternative Names (DNS and IP).
- **One-click deployment** — push certificates to [10 kinds of target](#deployment-targets) over SSH/SFTP or the target's own API.
- **Expiry tracking** — the dashboard surfaces certificates expiring within 30 days, ordered by urgency.
- **Encrypted at rest** — private keys are stored AES-256-GCM encrypted under a password you choose; never in plaintext.
- **Offline by design** — no network calls, no fonts or assets fetched from CDNs. Works on air-gapped machines.
- **Bilingual UI** — Portuguese (pt-BR) and English (en-US).

### Project status

This is a **0.1.x** release. The core workflow — create a CA, issue certificates, deploy them, track expiry — works end to end. Some actions are visible in the UI but not implemented yet, and are shown disabled with a tooltip rather than failing silently:

| Area | Status |
|---|---|
| Create CA, issue / revoke / delete certificates | ✅ Working |
| Export CA and certificates to file | ✅ Working |
| Deploy to servers, test connection | ✅ Working |
| Expiry dashboard | ✅ Working |
| Import an existing CA | 🚧 Planned |
| CA backup / restore, change CA password | 🚧 Planned |
| Automated renewal | 🚧 Planned |
| macOS builds | 🚧 Untested — the build target exists but no release is published |

---

## Download & Installation

Pre-built binaries are published on the [Releases page](https://github.com/onlitec/OnliCerManager/releases).

> **Note:** builds are not code-signed yet. Windows SmartScreen and some Linux tools may warn that the publisher is unverified — this is expected for an unsigned open-source build, not a sign of tampering. See [Verifying a release](#verifying-a-release) if you want to check what you downloaded.

### About OpenSSL

All cryptography is delegated to the real OpenSSL binary rather than reimplemented, so the app needs one available.

- **Windows:** nothing to do — OpenSSL ships inside the app. Windows has no system OpenSSL, so the installer and portable build both carry their own copy (currently 3.5.7 LTS), used in preference to anything on your `PATH`.
- **Linux:** uses the system OpenSSL. The `.deb` declares it as a dependency, so `apt` installs it for you; for the AppImage, `sudo apt install openssl` (or `sudo dnf install openssl`) if it somehow isn't already present.

If OpenSSL can't be found, the app says so on your first action and tells you how to install it for your platform.

<details>
<summary><b>Where the bundled Windows binary comes from</b></summary>

It's [FireDaemon's OpenSSL distribution for Windows](https://kb.firedaemon.com/support/solutions/articles/4000121705), which publishes checksums and permits redistribution under the OpenSSL licence (Apache 2.0). The bundled files carry OpenSSL's `LICENSE.txt` in `resources/openssl/win32/`.

The binary is **not** committed to this repository. `scripts/fetch_openssl_windows.js` downloads it during the build, pinned by version *and* SHA-256; if upstream ever serves different bytes, the hash check fails and the build stops rather than shipping an unverified crypto binary.

**The trade-off:** bundling means you get OpenSSL security fixes when we ship a release, not when your OS updates. On Linux, where a system OpenSSL is available and patched by your distribution, we deliberately don't bundle.

</details>

### Windows 10 / 11

Two formats are published for every release:

| File | What it is | When to use it |
|------|------------|-----------------|
| `OnliCert-Manager-Setup-<version>.exe` | Full installer (NSIS) | Normal desktop install, with shortcuts and an uninstaller |
| `OnliCert-Manager-<version>-win-portable.zip` | Portable build | No install or admin rights needed; run from a USB drive |

<details>
<summary><b>Installer — step by step</b></summary>

1. Download `OnliCert-Manager-Setup-<version>.exe` from [Releases](https://github.com/onlitec/OnliCerManager/releases).
2. Run it. If Windows SmartScreen shows *"Windows protected your PC"*, click **More info → Run anyway** (this is because the binary isn't code-signed, not a malware detection).
3. The installer lets you pick the install directory and creates Desktop and Start Menu shortcuts named **OnliCert Manager**. It is not a silent/one-click installer, so you'll see each step.
4. Launch it from the Start Menu or the Desktop shortcut.
5. To remove it later: **Settings → Apps → OnliCert Manager → Uninstall**, or run the uninstaller in the install directory.

</details>

<details>
<summary><b>Portable — no installation</b></summary>

1. Download `OnliCert-Manager-<version>-win-portable.zip` from [Releases](https://github.com/onlitec/OnliCerManager/releases).
2. Extract the ZIP anywhere — a regular folder, an external drive, whatever.
3. Run `OnliCert Manager.exe` inside the extracted folder. Nothing is installed and no admin rights are needed.
4. Your CA, certificates and logs are **not** kept inside that folder — they live in `%APPDATA%\@onlicert\desktop\` (see [Where your data lives](#where-your-data-lives)), so they survive moving or deleting the portable folder.

</details>

### Windows Server (2016 / 2019 / 2022)

The installer and portable build both run on Windows Server exactly as on Windows 10/11 — follow the steps above. Two server-specific points:

- **Desktop Experience is required.** OnliCert Manager is a GUI (Electron) application and will **not** run on **Server Core**. If the GUI shell isn't present, add it with `Install-WindowsFeature Server-Gui-Shell` (or *Server Manager → Add Roles and Features*).
- **Use Group Policy to distribute the CA**, not `certutil` on every box. Once you've exported `ca.crt`, push it domain-wide via *Group Policy Management → (your GPO) → Computer Configuration → Policies → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities → Import*.

### Linux

Two formats are published for every release, both x86-64:

| File | What it is | When to use it |
|------|------------|-----------------|
| `OnliCert-Manager-<version>.AppImage` | Self-contained binary | Any distro; no installation, no root |
| `onlicert-manager_<version>_amd64.deb` | Debian package | Debian, Ubuntu, Mint — integrates with your package manager |

**AppImage**

```bash
chmod +x OnliCert-Manager-*.AppImage
./OnliCert-Manager-*.AppImage
```

> AppImages need FUSE. On Ubuntu 22.04+ and other recent distros: `sudo apt install libfuse2` (`libfuse2t64` on newer Ubuntu). To skip FUSE entirely, run it as `./OnliCert-Manager-*.AppImage --appimage-extract-and-run`.

**Debian package**

```bash
sudo apt install ./onlicert-manager_*_amd64.deb
```

`apt` pulls in the dependencies, including `openssl` — which the app invokes directly, so it must be present. Afterwards, launch **OnliCert Manager** from your application menu, or run `onlicert-manager` from a terminal.

To uninstall: `sudo apt remove onlicert-manager`.

> Not on x86-64 (e.g. a Raspberry Pi or an ARM server)? No ARM build is published — [build from source](#build-from-source) instead; `pnpm --filter desktop build` packages for whatever architecture it runs on.

### Verifying a release

Every release lists the commit it was built from. To confirm a download matches the published source, compare the checksum on the [release page](https://github.com/onlitec/OnliCerManager/releases), or rebuild it yourself with the steps above — the build runs from source on any platform.

---

## Getting Started (First Run)

1. **Create your Root CA** — go to **Certificate Authority** in the sidebar and fill in the CA name, Common Name, key algorithm and validity period. You'll set a **master password** here: it encrypts the CA's private key at rest and is required every time you issue a certificate. **If you lose it, the CA cannot be recovered.**
2. **Export the CA certificate** — click **Export CA** to save `ca.crt`, then install it on the machines that should trust your certificates. Only the *public* certificate is written to that file; the private key never leaves the app unencrypted, so it's safe to distribute freely.
3. **Issue a certificate** — **Certificates → Issue Certificate**. Fill in the Common Name (the FQDN the service is reached at), the certificate type, any Subject Alternative Names, and your CA password.
4. **Register a target server** — **Servers → Add Server**, pick a [deployment plugin](#deployment-targets), enter its connection details, and use **Test Connection** before saving.
5. **Deploy** — use **Deploy** on the server to push the certificate and its key to the target.
6. **Watch for renewals** — the dashboard highlights anything expiring within 30 days.

<details>
<summary><b>Installing the CA certificate on client machines</b></summary>

Until clients trust your CA, browsers will still warn about certificates it issued.

```powershell
# Windows (admin PowerShell / CMD)
certutil -addstore -f "ROOT" C:\path\to\ca.crt
```

```bash
# Debian / Ubuntu
sudo cp ca.crt /usr/local/share/ca-certificates/onlicert-root-ca.crt
sudo update-ca-certificates
```

**Firefox** keeps its own certificate store: *Settings → Privacy & Security → Certificates → View Certificates… → Authorities → Import…*, then tick *Trust this CA to identify websites*.

**macOS:** open `ca.crt` in Keychain Access, move it to the **System** keychain, then set it to *Always Trust*.

For domain-wide deployment on Windows, see the [Group Policy note above](#windows-server-2016--2019--2022).

</details>

### Where your data lives

Everything is local — no cloud account, no telemetry. The SQLite database and logs live in Electron's standard per-OS `userData` folder:

| Platform | Location |
|---|---|
| Windows | `%APPDATA%\@onlicert\desktop\` |
| Linux | `~/.config/@onlicert/desktop/` |

This is the same folder for the AppImage, the `.deb` and the portable build, so switching between them keeps your CA and certificates.

Inside you'll find `onlicert.db` (the database) and `logs/` — check the logs first if something misbehaves.

> **Back this folder up.** It holds your CA's encrypted private key. Losing it means losing the CA.

---

## Deployment Targets

Certificates can be pushed directly to any of these. API-based targets talk to the product's own REST API; the rest use SSH/SFTP.

| Target | Transport | Notes |
|---|---|---|
| **Proxmox VE** | REST API | Updates `pveproxy` without restarting VMs; uses an API token |
| **MikroTik RouterOS** | API | Uploads and binds the certificate |
| **NGINX** | SSH/SFTP | Writes the cert/key and reloads the service |
| **Apache** | SSH/SFTP | Writes the cert/key and reloads the service |
| **Traefik** | SSH/SFTP | Drops files into the configured directory |
| **Docker** | SSH/SFTP | For containerised reverse proxies |
| **TrueNAS** | SSH/SFTP | |
| **Samba** | SSH/SFTP | |
| **Generic Linux** | SSH/SFTP | Configurable destination paths |
| **Custom SSH** | SSH/SFTP | Full control over paths and the post-deploy command |

Adding a new target means implementing the `IPlugin` contract — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Security

- **Private keys are never stored in plaintext.** They're encrypted with AES-256-GCM using a scrypt-derived key from your password.
- **No shell interpolation.** OpenSSL and every other external process is invoked via `spawn`/`execFile` with an explicit argument array, so a hostname or Common Name can never be interpreted as a shell command.
- **Passwords are never passed as CLI arguments** — they go to OpenSSL through environment variables, so they don't appear in the process list.
- **Hardened Electron** — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and a strict Content-Security-Policy. The renderer has no direct Node or filesystem access.
- **Explicit IPC surface** — the renderer can only call a hardcoded allowlist of typed IPC channels.
- **No outbound connections**, except the SSH/API calls you explicitly configure for deployment.

Found a security issue? Please open an issue — or, for anything sensitive, contact the maintainers privately first.

---

## Build from Source

Requires [Node.js](https://nodejs.org/) >= 20, [pnpm](https://pnpm.io/) >= 9, and OpenSSL on `PATH` (the tests invoke it directly, so it's needed even on Windows where the packaged app bundles its own).

```bash
git clone https://github.com/onlitec/OnliCerManager.git
cd OnliCerManager
pnpm install
pnpm dev          # run in development mode
```

Common tasks — all run from the repo root:

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app in development (Vite + Electron) |
| `pnpm build` | Build the app and package an installer |
| `pnpm lint` | ESLint across all packages |
| `pnpm typecheck` | `tsc --noEmit` across all packages |
| `pnpm test` | Vitest across all packages |
| `pnpm format` | Prettier |

Scope any of them to one package with `pnpm --filter <name> <script>`, e.g. `pnpm --filter @onlicert/infrastructure test`.

> Infrastructure tests spawn the real OpenSSL binary, so OpenSSL must be installed and on `PATH`.

### Project structure

A pnpm workspace following Clean Architecture — the domain layer has no knowledge of Electron, SQLite or OpenSSL:

```
apps/
  desktop/                 Electron + React 19 + Vite (the only app)
    electron/              main process: IPC handlers, preload bridge
    src/                   renderer: pages, components, hooks, i18n
packages/
  core/                    domain entities and application services
  infrastructure/          OpenSSL wrapper, SQLite repositories, encryption
  plugins/
    plugin-interface/      the IPlugin contract
    proxmox/  mikrotik/    API-based deployment plugins
scripts/                   icon generation, packaged-build smoke test
docs/                      user manual (PDF)
```

### Technology stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript, Vite, TailwindCSS, Radix UI |
| Desktop shell | Electron 33 |
| Database | SQLite (`better-sqlite3`, WAL mode) |
| Cryptography | OpenSSL CLI (bundled on Windows, system on Linux) |
| Remote access | `ssh2`, `ssh2-sftp-client` |
| Logging | Winston |
| Tests | Vitest |

---

## Documentation

A full illustrated user manual (in Portuguese) ships with the app — press <kbd>F1</kbd>, or read [`docs/manual_onlicert_manager.pdf`](docs/manual_onlicert_manager.pdf). It covers every screen field by field, choosing between RSA and ECC, installing the root CA on Windows/Linux/macOS/Firefox, and setting up Proxmox and MikroTik deployment.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and the checks to run before opening a PR.

## License

[MIT](LICENSE) © OnliCert Manager Contributors
