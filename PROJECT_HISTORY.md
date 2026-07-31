# Histórico de Desenvolvimento e Arquitetura — OnliCert Manager

Este documento registra o histórico completo de desenvolvimento, decisões de arquitetura, estrutura do projeto, segurança, testes e instruções de empacotamento do **OnliCert Manager**.

---

## 📌 Visão Geral do Projeto

O **OnliCert Manager** é uma aplicação Desktop Open Source desenvolvida para Windows, Linux e macOS que simplifica a administração e emissão de Certificados Digitais SSL/TLS corporativos.

- **Motor Criptográfico**: **OpenSSL Oficial** (NUNCA reimplementado em JS/TS).
- **Arquitetura**: Monorepo (`pnpm workspaces`) com Clean Architecture.
- **Frontend**: React 19 + Vite + TailwindCSS v4 + Shadcn/UI + i18n (pt-BR / en-US).
- **Backend / Desktop**: Electron + Node.js + TypeScript + Winston + SQLite (`better-sqlite3`).
- **Segurança**: Criptografia AES-256-GCM + `scrypt` para chaves em repouso. IPC seguro (`contextIsolation: true`, `nodeIntegration: false`).

---

## 🏗️ Estrutura do Monorepo

```text
OnliSSL/
├── apps/
│   └── desktop/                  # Aplicação Electron + React 19 + Vite
│       ├── electron/
│       │   ├── ipc/              # IPC Handlers (ca, certs, servers)
│       │   ├── logger.ts         # Logger Winston configurado em AppData
│       │   ├── main.ts           # Processo Principal do Electron
│       │   └── preload.ts        # Bridge IPC seguro tipado
│       └── src/                  # Interface do Usuário (React 19 + Shadcn/UI)
│           ├── components/       # Componentes visuais (Dashboard, CA, Certs, Servers)
│           ├── hooks/            # Custom Hooks (useToast, useTheme)
│           ├── pages/            # Páginas (Dashboard, CA, Certificados, Servidores)
│           └── lib/              # Utilitários de UI e testes
├── packages/
│   ├── core/                     # Camada de Domínio e Casos de Uso
│   │   ├── src/domain/           # Entidades (Certificate, CA, Server), Value Objects
│   │   └── src/application/      # Serviços (CAService, CertificateService)
│   ├── infrastructure/           # Camada de Infraestrutura e Banco de Dados
│   │   ├── src/openssl/          # Wrapper seguro e Comandos OpenSSL CLI
│   │   ├── src/database/         # SQLite DatabaseConnection e Repositórios
│   │   ├── src/encryption/       # AES256Service (AES-256-GCM + scrypt)
│   │   └── src/plugins/          # PluginRegistry para conectores
│   └── plugins/
│       ├── plugin-interface/     # Interfaces tipadas de plugins (IPlugin)
│       ├── proxmox/              # Plugin de implantação no Proxmox VE
│       └── mikrotik/             # Plugin de implantação no MikroTik RouterOS
├── installer/
│   └── setup.iss                 # Script de compilação Inno Setup 6
├── electron-builder.yml          # Configuração do electron-builder (NSIS/AppImage/DMG)
├── tsconfig.base.json            # Configuração base do TypeScript
└── package.json                  # Workspaces pnpm e scripts raiz
```

---

## 🔐 Módulos Implementados

### 1. OpenSSL Cryptographic Engine (`packages/infrastructure/src/openssl`)
- **`OpenSSLWrapper`**: Invoca o binário oficial do OpenSSL via `spawn` seguro sem riscos de shell injection.
- **`GenKeyCommand`**: Geração de chaves privadas e públicas RSA (2048, 4096) e ECC (P-256, P-384, P-521).
- **`ReqCommand`**: Geração de requisições de assinatura (CSR) e emissão de CA Raiz autoassinada.
- **`X509Command`**: Leitura e extração de metadados de certificados (CN, SAN, datas, serial, fingerprint SHA256) e conversão entre formatos PEM e DER.
- **`CACommand`**: Assinatura de CSRs com extensões avançadas (Subject Alternative Names, KeyUsage, ExtendedKeyUsage).
- **`VerifyCommand`**: Validação de cadeia de certificados via `openssl verify`.
- **`PKCS12Command`**: Exportação para o formato PFX / PKCS#12 com proteção de senha.

### 2. Banco de Dados e Criptografia (`packages/infrastructure/src/database`)
- **SQLite com modo WAL**: Desempenho concorrente otimizado e chaves estrangeiras ativas.
- **Migrations Versionadas**: Tabela `schema_migrations` garantindo atualizações de schema automáticas.
- **Repositórios**: `CARepository`, `CertificateRepository`, `ServerRepository`.
- **`AES256Service`**: Criptografia de chaves privadas em repouso antes de salvar no banco SQLite usando `AES-256-GCM` com salt aleatório e `scrypt`.

### 3. Conectores de Implantação Automatizada (Plugins)
- **`@onlicert/plugin-proxmox`**: Implantação automática em nós do Proxmox VE via API REST HTTPS (`/api2/json/nodes/{node}/certificates/custom`).
- **`@onlicert/plugin-mikrotik`**: Implantação de certificados no MikroTik RouterOS v7+ via API REST (`/rest/certificate/import`).

### 4. Interface do Usuário React 19 (`apps/desktop/src`)
- **Dashboard**: Indicadores em tempo real de total de certificados, servidores cadastrados, alertas de vencimento e status da CA.
- **Gerenciamento da CA**: Wizard para criação da CA Raiz local com proteção por senha mestra e cópia/exportação de PEM.
- **Gerenciamento de Certificados**: Emissão de certificados (Servidor, Cliente, VPN, Code Signing) com múltiplos SANs, busca por nome/CN, badges de validade, revogação e exclusão.
- **Gerenciamento de Servidores**: Cadastro de servidores, teste de conexão em tempo real e implantação de certificados em 1-clique.

---

## 🧪 Testes Automatizados (15/15 Aprovados)

- **`packages/core`**: Testes unitários do `CertificateValidator`.
- **`packages/infrastructure`**: Testes de integração do SQLite, criptografia AES-256-GCM e execução de comandos do OpenSSL real (geração de chaves RSA/ECC, emissão de CA Raiz, assinatura de CSR, verificação `openssl verify`).
- **`apps/desktop`**: Testes unitários dos utilitários visuais e formatadores de data.

---

## 📦 Empacotamento e Distribuição

- **Instalador NSIS gerado**: `apps/desktop/dist-release/OnliCert Manager Setup 0.1.0.exe` (83.6 MB).
- **Script Inno Setup**: `installer/setup.iss` disponível para compilação via `ISCC.exe`.
- **CI/CD**: Workflow no GitHub Actions (`.github/workflows/ci.yml`) configurado para compilar instaladores multi-plataforma (Windows `.exe`, Linux `.AppImage`/`.deb`, macOS `.dmg`).

---

## 📝 Resolução de Problemas Conhecidos

- **Erro `EPERM` em permissão de pasta de logs**: Corrigido no `logger.ts` para gravar em `%APPDATA%\OnliCert Manager\logs`, evitando tentativa de escrita sem privilégios em `C:\Program Files\`.
- **Compilação de módulos nativos no Windows**: Resolvido com desativação do rebuild nativo desnecessário (`npmRebuild: false` no `electron-builder.yml`) e utilização de prebuilds do `better-sqlite3`.

---

*Histórico salvo em: 31 de Julho de 2026*
