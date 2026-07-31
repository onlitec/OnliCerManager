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

## Quick Start (Development)

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- OpenSSL installed (Linux: `sudo apt install openssl`)

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
