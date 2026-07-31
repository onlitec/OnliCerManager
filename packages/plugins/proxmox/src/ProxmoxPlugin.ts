import type {
  IPlugin,
  IPluginMetadata,
  IDeployInput,
  IDeployResult,
  IVerifyResult,
} from "@onlicert/plugin-interface";
import https from "https";
import { URL } from "url";

export class ProxmoxPlugin implements IPlugin {
  readonly metadata: IPluginMetadata = {
    id: "proxmox",
    name: "Proxmox VE",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    description: "Implantação automática de certificados SSL/TLS no Proxmox VE via API REST (pveproxy).",
    configSchema: [
      { key: "host", label: "Endereço IP ou Hostname", type: "text", required: true, placeholder: "192.168.1.50" },
      { key: "port", label: "Porta API", type: "number", required: true, defaultValue: 8006 },
      { key: "node", label: "Nome do Nó (Node)", type: "text", required: true, placeholder: "pve" },
      { key: "tokenId", label: "API Token ID", type: "text", required: true, placeholder: "root@pam!onlicert" },
      { key: "secret", label: "API Token Secret", type: "password", required: true },
      { key: "verifySsl", label: "Validar SSL da API", type: "boolean", required: false, defaultValue: false },
    ],
  };

  async testConnection(config: Record<string, unknown>): Promise<boolean> {
    const host = String(config["host"] ?? "");
    const port = Number(config["port"] ?? 8006);
    const tokenId = String(config["tokenId"] ?? "");
    const secret = String(config["secret"] ?? "");
    const verifySsl = Boolean(config["verifySsl"] ?? false);

    const url = `https://${host}:${port}/api2/json/version`;
    const headers = { Authorization: `PVEAPIToken=${tokenId}=${secret}` };

    const res = await this.httpRequest(url, "GET", headers, undefined, verifySsl);
    return res.statusCode === 200;
  }

  async deploy(input: IDeployInput): Promise<IDeployResult> {
    const { certPem, keyPem, caPem, serverConfig } = input;
    const host = String(serverConfig["host"] ?? "");
    const port = Number(serverConfig["port"] ?? 8006);
    const node = String(serverConfig["node"] ?? "pve");
    const tokenId = String(serverConfig["tokenId"] ?? "");
    const secret = String(serverConfig["secret"] ?? "");
    const verifySsl = Boolean(serverConfig["verifySsl"] ?? false);

    // Build Full Chain PEM (cert + optional ca)
    const fullChainPem = caPem ? `${certPem.trim()}\n${caPem.trim()}\n` : certPem;

    const url = `https://${host}:${port}/api2/json/nodes/${node}/certificates/custom`;
    const headers = {
      Authorization: `PVEAPIToken=${tokenId}=${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const postData = new URLSearchParams({
      certificates: fullChainPem,
      key: keyPem,
      restart: "1",
    }).toString();

    try {
      const res = await this.httpRequest(url, "POST", headers, postData, verifySsl);
      if (res.statusCode === 200) {
        return {
          success: true,
          message: `Certificado implantado com sucesso no nó Proxmox '${node}'. O serviço pveproxy foi reiniciado.`,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: `Falha na API Proxmox (HTTP ${res.statusCode}): ${res.body}`,
          timestamp: new Date(),
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Erro de rede ao conectar no Proxmox: ${(err as Error).message}`,
        timestamp: new Date(),
      };
    }
  }

  async verify(config: Record<string, unknown>): Promise<IVerifyResult> {
    const host = String(config["host"] ?? "");
    const port = Number(config["port"] ?? 8006);
    const node = String(config["node"] ?? "pve");
    const tokenId = String(config["tokenId"] ?? "");
    const secret = String(config["secret"] ?? "");
    const verifySsl = Boolean(config["verifySsl"] ?? false);

    const url = `https://${host}:${port}/api2/json/nodes/${node}/certificates/info`;
    const headers = { Authorization: `PVEAPIToken=${tokenId}=${secret}` };

    try {
      const res = await this.httpRequest(url, "GET", headers, undefined, verifySsl);
      if (res.statusCode === 200) {
        const json = JSON.parse(res.body);
        const certInfo = json.data?.[0];
        return {
          success: true,
          subject: certInfo?.subject,
          validTo: certInfo?.notafter,
          message: "Certificado verificado com sucesso no Proxmox.",
        };
      }
      return { success: false, message: `Falha ao obter info do certificado (HTTP ${res.statusCode})` };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  private httpRequest(
    urlString: string,
    method: string,
    headers: Record<string, string>,
    body?: string,
    verifySsl = false
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlString);
      const req = https.request(
        parsedUrl,
        {
          method,
          headers,
          rejectUnauthorized: verifySsl,
        },
        (res) => {
          let responseBody = "";
          res.on("data", (chunk) => { responseBody += chunk; });
          res.on("end", () => {
            resolve({ statusCode: res.statusCode ?? 500, body: responseBody });
          });
        }
      );

      req.on("error", (err) => reject(err));
      if (body) req.write(body);
      req.end();
    });
  }
}

export default new ProxmoxPlugin();
