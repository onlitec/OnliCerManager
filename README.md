# OnliCert Manager

> **Professional certificate management with local CA support.**
> No command-line knowledge required. Powered by OpenSSL.

[![CI](https://github.com/onlitec/OnliCerManager/actions/workflows/ci.yml/badge.svg)](https://github.com/onlitec/OnliCerManager/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What is OnliCert Manager?

OnliCert Manager is an open-source Desktop application for Windows and Linux that lets system administrators:

- **Create a local CA** (Certificate Authority) with RSA or ECC
- **Issue certificates** for servers, clients, VPN, code signing, e-mail
- **Deploy automatically** to Proxmox, MikroTik, TrueNAS, Nginx, Apache, Traefik, Docker, Windows and Linux
- **Manage renewals** with expiry alerts

Everything runs locally. No cloud. No accounts required.

---

## Download & Installation

Pre-built binaries are published on the [Releases page](https://github.com/onlitec/OnliCerManager/releases). Pick the option that fits your platform below.

> **Note:** builds are not code-signed yet. Windows SmartScreen and some Linux tools may warn that the publisher is unverified — this is expected for an unsigned open-source build, not a sign of tampering. See [Verifying a release](#verifying-a-release) if you want to double-check what you downloaded.

### Windows

Two formats are published for every release:

| File | What it is | When to use it |
|------|------------|-----------------|
| `OnliCert.Manager.Setup.<version>.exe` | Full installer (NSIS) | Normal desktop install, with shortcuts and an uninstaller |
| `OnliCert-Manager-<version>-win-portable.zip` | Portable build | No install/admin rights needed; run from a USB drive, etc. |

**Installer:**

1. Download `OnliCert.Manager.Setup.<version>.exe` from [Releases](https://github.com/onlitec/OnliCerManager/releases).
2. Run it. If Windows SmartScreen shows "Windows protected your PC", click **More info → Run anyway** (this is because the binary isn't code-signed, not a malware detection).
3. The installer lets you pick the install directory and creates a Desktop and Start Menu shortcut named **OnliCert Manager**. It is not a silent/one-click installer, so you'll see each step.
4. Launch it from the Start Menu or the Desktop shortcut.
5. To remove it later, use **Settings → Apps → OnliCert Manager → Uninstall**, or run the uninstaller placed in the install directory.

**Portable (no installation):**

1. Download `OnliCert-Manager-<version>-win-portable.zip` from [Releases](https://github.com/onlitec/OnliCerManager/releases).
2. Extract the ZIP anywhere (a regular folder, an external drive, etc.).
3. Run `OnliCert Manager.exe` inside the extracted folder directly — nothing is installed, no admin rights required.
4. Your CA, certificates and logs are **not** stored inside this folder; they live in `%APPDATA%\OnliCert Manager\` (see [Where your data lives](#where-your-data-lives)), so they persist even if you move or delete the portable folder.

### Linux

There is no pre-built Linux package yet — build the `.AppImage` and `.deb` from source. This only needs to be done once per machine (or version).

**1. Install prerequisites:**

```bash
# Debian/Ubuntu
sudo apt install openssl build-essential python3

# Node.js >= 20 and pnpm >= 9 (if you don't have them already)
# See https://nodejs.org/ and https://pnpm.io/installation
```

`build-essential` and `python3` are required by `node-gyp` to compile the native modules used by this app (`better-sqlite3`, `ssh2`).

**2. Clone, install dependencies, and build:**

```bash
git clone https://github.com/onlitec/OnliCerManager.git
cd OnliCerManager
pnpm install
pnpm --filter desktop build
```

This compiles the app and packages it with `electron-builder` for your host platform. When run on Linux, it produces an `.AppImage` and a `.deb` package inside `apps/desktop/dist-release/`.

**3. Install/run the package:**

```bash
# AppImage — just make it executable and run it
chmod +x apps/desktop/dist-release/*.AppImage
apps/desktop/dist-release/*.AppImage

# .deb — install it system-wide with apt or dpkg
sudo apt install ./apps/desktop/dist-release/*.deb
# or: sudo dpkg -i apps/desktop/dist-release/*.deb
```

> On recent distros (Ubuntu 22.04+, Fedora, etc.), AppImages require `libfuse2` to run: `sudo apt install libfuse2` (or `libfuse2t64` on newer Ubuntu releases). If you'd rather not install FUSE, extract and run it instead: `./OnliCert*.AppImage --appimage-extract-and-run`.

Once installed, launch **OnliCert Manager** from your application menu, or run the AppImage/`onlicert-manager` binary directly.

### Verifying a release

Every release on GitHub lists the exact commit it was built from. If you want to confirm a downloaded binary matches the published source, compare `apps/desktop/dist-release/latest.yml`'s checksum (Windows) against the one on the [release page](https://github.com/onlitec/OnliCerManager/releases), or rebuild it yourself following the Linux steps above (the build is reproducible from source on any platform).

---

## Getting Started (First Run)

Once the app is open, the typical workflow is:

1. **Create your Root CA** — go to **Autoridade Certificadora (CA)** in the sidebar and fill in the CA name, Common Name, key algorithm (RSA or ECC) and validity period. You'll set a **master password** here — it encrypts the CA's private key at rest (AES-256-GCM) and is required every time you issue a certificate, so don't lose it.
2. **Issue a certificate** — go to **Certificados → Emitir Certificado**, fill in the Common Name, certificate type (server, client, VPN, code signing, e-mail…), any Subject Alternative Names, and the CA password from step 1.
3. **Register a target server** — go to **Servidores → Adicionar Servidor** and pick a deployment plugin: Proxmox VE, MikroTik RouterOS, TrueNAS, Nginx, Apache, Traefik, Docker, Samba, or a generic SSH server. Fill in its connection details and use **Testar Conexão** before saving.
4. **Deploy the certificate** — from the Servers or Certificates page, use **Implantar** to push the certificate (and private key) to the registered server over its plugin (SSH/SFTP or the target's REST API).
5. **Keep an eye on renewals** — the Dashboard highlights certificates that are expiring soon.

### Where your data lives

Everything is local — there's no cloud account and no telemetry. The SQLite database (CA, certificates, server configs) and log files live in Electron's standard per-OS `userData` folder for this app:

- **Windows:** `%APPDATA%\OnliCert Manager\` (i.e. `C:\Users\<you>\AppData\Roaming\OnliCert Manager\`)
- **Linux:** `~/.config/OnliCert Manager/`

Inside that folder: `onlicert.db` (SQLite database) and `logs/` (Winston logs — check these first if something isn't working).

---

## Build from Source (Development)

If you want to run the app from source instead of a packaged build — e.g. to contribute or debug:

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- OpenSSL installed (Linux: `sudo apt install openssl`; bundled automatically on Windows)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/onlitec/OnliCerManager.git
cd OnliCerManager

# Install dependencies
pnpm install

# Start in development mode
pnpm dev
```

To produce a packaged build yourself (installer/portable on Windows, AppImage/.deb on Linux) instead of running in dev mode, use `pnpm --filter desktop build` — see the [Download & Installation](#download--installation) section above for what that produces on each platform.

---

## Project Structure

```
onlicert-manager/
├── apps/
│   └── desktop/          # Electron + React 19 + Vite application
├── packages/
│   ├── core/             # Domain entities and business logic
│   ├── infrastructure/   # OpenSSL wrapper, SQLite, SSH, encryption
│   └── plugins/
│       ├── plugin-interface/  # Plugin contract (IPlugin)
│       ├── proxmox/           # Proxmox VE plugin
│       ├── mikrotik/          # MikroTik plugin
│       └── ...                # Other deployment plugins
├── resources/
│   └── openssl/win32/    # Bundled OpenSSL binary for Windows
└── docs/                 # Documentation
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | TailwindCSS, Shadcn/UI |
| Desktop | Electron |
| Backend | Node.js (main process) |
| Database | SQLite (better-sqlite3) |
| Cryptography | OpenSSL (bundled on Windows) |
| SSH | ssh2, ssh2-sftp-client |
| Logging | Winston |

---

## Security

- Private keys are **never stored in plaintext** — encrypted with AES-256-GCM + scrypt
- OpenSSL is invoked via `spawn` (no shell) — **no command injection** possible
- Electron with `contextIsolation: true` and `nodeIntegration: false`
- All IPC channels are typed and validated

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — see [LICENSE](LICENSE) for details.
