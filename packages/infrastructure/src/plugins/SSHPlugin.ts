import type {
  IPlugin,
  IPluginMetadata,
  IDeployInput,
  IDeployResult,
  IVerifyResult,
  IConfigField,
} from "@onlicert/plugin-interface";
import { randomUUID } from "node:crypto";
import { Client } from "ssh2";
import type { ConnectConfig } from "ssh2";
import SFTPClient from "ssh2-sftp-client";

export const STANDARD_SSH_FIELDS: IConfigField[] = [
  { key: "host", label: "Endereço IP ou Hostname", type: "text", required: true, placeholder: "192.168.1.100" },
  { key: "port", label: "Porta SSH", type: "number", required: true, defaultValue: 22 },
  {
    key: "authType",
    label: "Autenticação SSH",
    type: "select",
    required: true,
    defaultValue: "password",
    options: [
      { value: "password", label: "Senha do Usuário" },
      { value: "privateKey", label: "Chave Privada SSH (PEM)" },
    ],
  },
  { key: "username", label: "Usuário SSH", type: "text", required: true, defaultValue: "root", placeholder: "root, ubuntu, debian ou admin" },
  { key: "password", label: "Senha SSH", type: "password", required: false, placeholder: "Senha do servidor" },
  { key: "privateKey", label: "Chave Privada SSH (PEM)", type: "textarea", required: false, placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----" },
  { key: "passphrase", label: "Senha da Chave SSH (Opcional)", type: "password", required: false },
  {
    key: "useSudo",
    label: "Usar sudo para elevação de privilégios",
    type: "boolean",
    required: false,
    defaultValue: true,
    hint: "Evita erro 'Permission denied' ao gravar em diretórios do sistema (/etc/ssl/ ou /etc/samba/) com usuário não-root.",
  },
];

export class SSHPlugin implements IPlugin {
  readonly metadata: IPluginMetadata;

  constructor(metadata: IPluginMetadata) {
    this.metadata = metadata;
  }

  /**
   * Single-quote a value for safe interpolation into a POSIX shell command
   * executed on the remote host (ssh2's `exec` has no argv-array form).
   */
  private static shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }

  /**
   * Read a plugin config value as a string. Config comes from JSON stored in
   * SQLite (`Record<string, unknown>`), so a stray non-string value must fall
   * back rather than silently stringify to "[object Object]".
   */
  private static asString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
  }

  private buildSshConfig(config: Record<string, unknown>): ConnectConfig {
    const host = SSHPlugin.asString(config.host);
    const port = Number(config.port ?? 22);
    const username = SSHPlugin.asString(config.username, "root");
    const authType = SSHPlugin.asString(config.authType, "password");
    const password = SSHPlugin.asString(config.password) || undefined;
    const privateKey = SSHPlugin.asString(config.privateKey) || undefined;
    const passphrase = SSHPlugin.asString(config.passphrase) || undefined;

    const sshOptions: ConnectConfig = {
      host,
      port,
      username,
      readyTimeout: 10000,
    };

    if (authType === "privateKey" && privateKey) {
      sshOptions.privateKey = privateKey;
      if (passphrase) sshOptions.passphrase = passphrase;
    } else if (password) {
      sshOptions.password = password;
    }

    return sshOptions;
  }

  private formatSudoCmd(cmd: string, config: Record<string, unknown>): string {
    const username = SSHPlugin.asString(config.username, "root");
    const useSudo = config.useSudo !== undefined ? Boolean(config.useSudo) : username !== "root";
    if (!useSudo || username === "root") return cmd;
    if (cmd.startsWith("sudo ")) return cmd;

    const sudoPassword = SSHPlugin.asString(config.sudoPassword) || SSHPlugin.asString(config.password);

    if (sudoPassword) {
      return `echo ${SSHPlugin.shellQuote(sudoPassword)} | sudo -S -p '' ${cmd}`;
    }
    return `sudo ${cmd}`;
  }

  private async detectActiveService(sshOptions: ConnectConfig, serverConfig: Record<string, unknown>): Promise<string | null> {
    const checkScript = this.formatSudoCmd(
      `if systemctl is-active --quiet samba-ad-dc 2>/dev/null; then echo "samba-ad-dc"; ` +
      `elif systemctl is-active --quiet smbd 2>/dev/null; then echo "smbd"; ` +
      `elif systemctl is-active --quiet nginx 2>/dev/null; then echo "nginx"; ` +
      `elif systemctl is-active --quiet apache2 2>/dev/null; then echo "apache2"; ` +
      `elif systemctl is-active --quiet httpd 2>/dev/null; then echo "httpd"; ` +
      `elif systemctl is-active --quiet traefik 2>/dev/null; then echo "traefik"; ` +
      `elif systemctl is-active --quiet docker 2>/dev/null; then echo "docker"; ` +
      `fi`,
      serverConfig
    );

    try {
      const detected = await this.execCommand(sshOptions, checkScript);
      return detected.trim() || null;
    } catch {
      return null;
    }
  }

  private async executeSmartReload(
    sshOptions: ConnectConfig,
    serverConfig: Record<string, unknown>,
    reloadCommand?: string
  ): Promise<{ success: boolean; message: string; output?: string }> {
    // 1. Try explicit command first if provided
    if (reloadCommand?.trim()) {
      const primaryCmd = this.formatSudoCmd(reloadCommand.trim(), serverConfig);
      try {
        const output = await this.execCommand(sshOptions, primaryCmd);
        return { success: true, message: `Executado comando de pós-implantação: '${reloadCommand}'`, output };
      } catch (primaryErr) {
        const primaryErrMsg = (primaryErr as Error).message;

        // Try auto-detecting the actual running service as fallback
        const detectedService = await this.detectActiveService(sshOptions, serverConfig);
        if (detectedService) {
          let fallbackCmd = `systemctl reload ${detectedService}`;
          if (detectedService === "samba-ad-dc" || detectedService === "smbd" || detectedService === "docker") {
            fallbackCmd = `systemctl restart ${detectedService}`;
          }
          try {
            const sudoFallback = this.formatSudoCmd(fallbackCmd, serverConfig);
            const output = await this.execCommand(sshOptions, sudoFallback);
            return {
              success: true,
              message: `O comando '${reloadCommand}' falhou (${primaryErrMsg}), mas detectamos o serviço '${detectedService}' ativo no servidor e executamos '${fallbackCmd}' com sucesso!`,
              output,
            };
          } catch {
            // ignore
          }
        }

        // Return non-fatal warning so certificate upload succeeds!
        return {
          success: true,
          message: `Aviso: Os certificados foram salvos com sucesso no servidor. Porém, o comando de recarga '${reloadCommand}' não pôde ser executado (${primaryErrMsg}). Caso este servidor utilize Samba ou outro serviço, execute a recarga manualmente (ex: systemctl restart samba-ad-dc).`,
          output: primaryErrMsg,
        };
      }
    }

    // 2. If no reloadCommand provided, auto-detect active service
    const detectedService = await this.detectActiveService(sshOptions, serverConfig);
    if (detectedService) {
      let autoCmd = `systemctl reload ${detectedService}`;
      if (detectedService === "samba-ad-dc" || detectedService === "smbd" || detectedService === "docker") {
        autoCmd = `systemctl restart ${detectedService}`;
      }
      try {
        const sudoAuto = this.formatSudoCmd(autoCmd, serverConfig);
        const output = await this.execCommand(sshOptions, sudoAuto);
        return {
          success: true,
          message: `Serviço '${detectedService}' detectado no servidor e recarregado automaticamente com '${autoCmd}'.`,
          output,
        };
      } catch {
        // ignore
      }
    }

    return { success: true, message: "Certificados instalados com sucesso no servidor." };
  }

  async testConnection(config: Record<string, unknown>): Promise<boolean> {
    const sshOptions = this.buildSshConfig(config);
    const client = new Client();

    return new Promise((resolve, reject) => {
      client.on("ready", () => {
        client.end();
        resolve(true);
      });
      client.on("error", (err) => {
        client.end();
        reject(new Error(`Falha de conexão SSH: ${err.message}`));
      });
      client.connect(sshOptions);
    });
  }

  async deploy(input: IDeployInput): Promise<IDeployResult> {
    const { certPem, keyPem, caPem, serverConfig } = input;
    const sshOptions = this.buildSshConfig(serverConfig);

    const username = SSHPlugin.asString(serverConfig.username, "root");
    const certPath = SSHPlugin.asString(serverConfig.certPath, "/etc/ssl/certs/server.crt");
    const keyPath = SSHPlugin.asString(serverConfig.keyPath, "/etc/ssl/private/server.key");
    const caPath = SSHPlugin.asString(serverConfig.caPath) || undefined;
    const reloadCommand = SSHPlugin.asString(serverConfig.reloadCommand).trim() || undefined;

    const useSudo = serverConfig.useSudo !== undefined ? Boolean(serverConfig.useSudo) : username !== "root";

    const sftp = new SFTPClient();

    try {
      await sftp.connect(sshOptions);

      const token = randomUUID();
      const tempCertPath = `/tmp/onlicert_cert_${token}.crt`;
      const tempKeyPath = `/tmp/onlicert_key_${token}.key`;
      const tempCaPath = `/tmp/onlicert_ca_${token}.crt`;

      let usedSudoEscalation = false;

      // Direct upload if root and useSudo is false
      if (!useSudo && username === "root") {
        try {
          const uploadDirect = async (remotePath: string, content: string, mode: number) => {
            const lastSlash = remotePath.lastIndexOf("/");
            if (lastSlash > 0) {
              const dir = remotePath.substring(0, lastSlash);
              try { await sftp.mkdir(dir, true); } catch { /* ignore */ }
            }
            await sftp.put(Buffer.from(content, "utf-8"), remotePath);
            await sftp.chmod(remotePath, mode);
          };

          await uploadDirect(certPath, certPem, 0o644);
          await uploadDirect(keyPath, keyPem, 0o600);
          if (caPem && caPath) {
            await uploadDirect(caPath, caPem, 0o644);
          }
        } catch {
          usedSudoEscalation = true;
        }
      } else {
        usedSudoEscalation = true;
      }

      // If non-root or direct upload failed: upload to /tmp then move with sudo
      if (usedSudoEscalation) {
        await sftp.put(Buffer.from(certPem, "utf-8"), tempCertPath);
        await sftp.put(Buffer.from(keyPem, "utf-8"), tempKeyPath);
        if (caPem && caPath) {
          await sftp.put(Buffer.from(caPem, "utf-8"), tempCaPath);
        }

        await sftp.end();

        // Escalate via SSH exec with sudo
        const getDir = (p: string) => p.substring(0, p.lastIndexOf("/"));
        const certDir = getDir(certPath);
        const keyDir = getDir(keyPath);
        const q = (value: string) => SSHPlugin.shellQuote(value);

        const sudoMkdirCert = this.formatSudoCmd(`mkdir -p ${q(certDir)}`, serverConfig);
        const sudoMkdirKey = this.formatSudoCmd(`mkdir -p ${q(keyDir)}`, serverConfig);
        const sudoCpCert = this.formatSudoCmd(`cp ${q(tempCertPath)} ${q(certPath)}`, serverConfig);
        const sudoCpKey = this.formatSudoCmd(`cp ${q(tempKeyPath)} ${q(keyPath)}`, serverConfig);
        const sudoChmodCert = this.formatSudoCmd(`chmod 644 ${q(certPath)}`, serverConfig);
        const sudoChmodKey = this.formatSudoCmd(`chmod 600 ${q(keyPath)}`, serverConfig);

        const sudoCmds = [
          sudoMkdirCert,
          sudoMkdirKey,
          sudoCpCert,
          sudoCpKey,
          sudoChmodCert,
          sudoChmodKey,
          `rm -f ${q(tempCertPath)} ${q(tempKeyPath)}`,
        ];

        if (caPem && caPath) {
          const caDir = getDir(caPath);
          sudoCmds.push(
            this.formatSudoCmd(`mkdir -p ${q(caDir)}`, serverConfig),
            this.formatSudoCmd(`cp ${q(tempCaPath)} ${q(caPath)}`, serverConfig),
            this.formatSudoCmd(`chmod 644 ${q(caPath)}`, serverConfig),
            `rm -f ${q(tempCaPath)}`
          );
        }

        const compositeCmd = sudoCmds.join(" && ");
        await this.execCommand(sshOptions, compositeCmd);
      } else {
        await sftp.end();
      }

      // Execute smart reload / fallback
      const reloadResult = await this.executeSmartReload(sshOptions, serverConfig, reloadCommand);

      return {
        success: true,
        message: `Certificados instalados com sucesso em '${certPath}' e '${keyPath}'. ${reloadResult.message}`,
        ...(reloadResult.output ? { details: `Saída do comando:\n${reloadResult.output}` } : {}),
        timestamp: new Date(),
      };
    } catch (err) {
      try {
        await sftp.end();
      } catch {
        // ignore
      }
      return {
        success: false,
        message: `Erro na implantação SSH: ${(err as Error).message}`,
        timestamp: new Date(),
      };
    }
  }

  async verify(config: Record<string, unknown>): Promise<IVerifyResult> {
    const certPath = SSHPlugin.asString(config.certPath, "/etc/ssl/certs/server.crt");
    try {
      const sshOptions = this.buildSshConfig(config);
      const verifyCmd = this.formatSudoCmd(
        `openssl x509 -in ${SSHPlugin.shellQuote(certPath)} -noout -subject -enddate`,
        config
      );
      const output = await this.execCommand(sshOptions, verifyCmd);
      return {
        success: true,
        message: `Certificado verificado no servidor: ${output}`,
      };
    } catch (err) {
      return {
        success: false,
        message: `Falha ao verificar certificado remoto em '${certPath}': ${(err as Error).message}`,
      };
    }
  }

  private execCommand(sshOptions: ConnectConfig, command: string): Promise<string> {
    const client = new Client();
    return new Promise((resolve, reject) => {
      client.on("ready", () => {
        client.exec(command, (err, stream) => {
          if (err) {
            client.end();
            reject(err); return;
          }
          let stdout = "";
          let stderr = "";
          stream.on("close", (code: number) => {
            client.end();
            if (code === 0) {
              resolve(stdout.trim());
            } else {
              reject(new Error(`Comando falhou (código ${code}): ${stderr || stdout}`));
            }
          });
          stream.on("data", (data: Buffer) => {
            stdout += data.toString();
          });
          stream.stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });
        });
      });
      client.on("error", (err) => {
        client.end();
        reject(err);
      });
      client.connect(sshOptions);
    });
  }
}

// Preset SSH Factory Helpers
export function createSambaPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "samba",
    name: "Samba / Active Directory",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M9 9h6v6H9z"/></svg>`,
    description: "Implantação remota de certificados SSL em servidores Samba (AD DC, LDAPS ou File Server) via SSH/SFTP com recarga automática.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado Samba", type: "text", required: true, defaultValue: "/etc/samba/tls/samba.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada Samba", type: "text", required: true, defaultValue: "/etc/samba/tls/samba.key" },
      { key: "caPath", label: "Caminho da CA Raiz (Opcional)", type: "text", required: false, defaultValue: "/etc/samba/tls/ca.crt" },
      { key: "reloadCommand", label: "Comando de Recarga Samba", type: "text", required: false, defaultValue: "systemctl restart samba-ad-dc || systemctl restart smbd" },
    ],
  });
}

export function createCustomSSHPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "custom_ssh",
    name: "Servidor Personalizado via SSH",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 10l3 3-3 3M14 16h2"/></svg>`,
    description: "Implantação remota em qualquer servidor Linux/Unix via SSH/SFTP com elevação sudo automática e personalização total de rotas e comandos.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado no Servidor", type: "text", required: true, defaultValue: "/etc/ssl/certs/server.crt", placeholder: "/etc/ssl/certs/server.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada no Servidor", type: "text", required: true, defaultValue: "/etc/ssl/private/server.key", placeholder: "/etc/ssl/private/server.key" },
      { key: "caPath", label: "Caminho do Certificado da CA (Opcional)", type: "text", required: false, defaultValue: "/etc/ssl/certs/ca.crt", placeholder: "/etc/ssl/certs/ca.crt" },
      { key: "reloadCommand", label: "Comando de Pós-Implantação / Reload", type: "text", required: false, defaultValue: "systemctl reload nginx", placeholder: "ex: systemctl restart samba-ad-dc ou systemctl reload nginx" },
    ],
  });
}

export function createNginxPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "nginx",
    name: "NGINX Web Server",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    description: "Implantação remota em servidores NGINX via SSH/SFTP com recarga automática do serviço.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado (.crt/.pem)", type: "text", required: true, defaultValue: "/etc/nginx/ssl/server.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada (.key)", type: "text", required: true, defaultValue: "/etc/nginx/ssl/server.key" },
      { key: "caPath", label: "Caminho da CA Raiz (Opcional)", type: "text", required: false, defaultValue: "/etc/nginx/ssl/ca.crt" },
      { key: "reloadCommand", label: "Comando de Reload NGINX", type: "text", required: false, defaultValue: "systemctl reload nginx" },
    ],
  });
}

export function createApachePlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "apache",
    name: "Apache HTTPd",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
    description: "Implantação remota em servidores Apache via SSH/SFTP com recarga automática do serviço.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado (.crt)", type: "text", required: true, defaultValue: "/etc/ssl/certs/apache-selfsigned.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada (.key)", type: "text", required: true, defaultValue: "/etc/ssl/private/apache-selfsigned.key" },
      { key: "caPath", label: "Caminho da CA (Opcional)", type: "text", required: false, defaultValue: "/etc/ssl/certs/ca-bundle.crt" },
      { key: "reloadCommand", label: "Comando de Reload Apache", type: "text", required: false, defaultValue: "systemctl reload apache2" },
    ],
  });
}

export function createTraefikPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "traefik",
    name: "Traefik Proxy",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 12h16M12 4v16"/></svg>`,
    description: "Implantação remota de certificados SSL em Traefik Reverse Proxy via SSH/SFTP.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado Traefik", type: "text", required: true, defaultValue: "/etc/traefik/certs/cert.pem" },
      { key: "keyPath", label: "Caminho da Chave Privada Traefik", type: "text", required: true, defaultValue: "/etc/traefik/certs/key.pem" },
      { key: "reloadCommand", label: "Comando de Reload (Opcional)", type: "text", required: false, defaultValue: "" },
    ],
  });
}

export function createDockerPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "docker",
    name: "Docker / Swarm",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 7V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/></svg>`,
    description: "Implantação remota de certificados em contêineres Docker via SSH/SFTP.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado no Host/Volume", type: "text", required: true, defaultValue: "/etc/docker/certs.d/server.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada no Host/Volume", type: "text", required: true, defaultValue: "/etc/docker/certs.d/server.key" },
      { key: "reloadCommand", label: "Comando de Reinício do Contêiner", type: "text", required: false, defaultValue: "docker restart web_app" },
    ],
  });
}

export function createTrueNASPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "truenas",
    name: "TrueNAS Core / SCALE",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
    description: "Implantação remota em servidores TrueNAS via SSH/SFTP.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado TrueNAS", type: "text", required: true, defaultValue: "/etc/certificates/truenas.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada TrueNAS", type: "text", required: true, defaultValue: "/etc/certificates/truenas.key" },
      { key: "reloadCommand", label: "Comando de Reload TrueNAS", type: "text", required: false, defaultValue: "service ix-nginx reload" },
    ],
  });
}

export function createLinuxGenericPlugin(): SSHPlugin {
  return new SSHPlugin({
    id: "linux_generic",
    name: "Servidor Linux Genérico",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
    description: "Implantação remota em qualquer servidor Linux (Ubuntu/Debian/CentOS/Fedora) via SSH/SFTP.",
    configSchema: [
      ...STANDARD_SSH_FIELDS,
      { key: "certPath", label: "Caminho do Certificado no Servidor", type: "text", required: true, defaultValue: "/etc/ssl/certs/server.crt" },
      { key: "keyPath", label: "Caminho da Chave Privada no Servidor", type: "text", required: true, defaultValue: "/etc/ssl/private/server.key" },
      { key: "caPath", label: "Caminho da CA (Opcional)", type: "text", required: false, defaultValue: "/etc/ssl/certs/ca.crt" },
      { key: "reloadCommand", label: "Comando de Pós-Implantação", type: "text", required: false, defaultValue: "" },
    ],
  });
}
