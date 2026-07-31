import type {
  IPlugin,
  IPluginMetadata,
  IDeployInput,
  IDeployResult,
  IVerifyResult,
} from "@onlicert/plugin-interface";
import https from "https";
import { URL } from "url";

export class MikrotikPlugin implements IPlugin {
  readonly metadata: IPluginMetadata = {
    id: "mikrotik",
    name: "MikroTik RouterOS",
    version: "1.0.0",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`,
    description: "Implantação de certificados SSL no RouterOS (v7+) via API REST (WebFig/SSTP/Hotspot).",
    configSchema: [
      { key: "host", label: "Endereço IP / Hostname", type: "text", required: true, placeholder: "192.168.88.1" },
      { key: "port", label: "Porta HTTPS (REST)", type: "number", required: true, defaultValue: 443 },
      { key: "username", label: "Usuário Admin", type: "text", required: true, defaultValue: "admin" },
      { key: "password", label: "Senha", type: "password", required: true },
      { key: "verifySsl", label: "Validar SSL", type: "boolean", required: false, defaultValue: false },
    ],
  };

  async testConnection(config: Record<string, unknown>): Promise<boolean> {
    const host = String(config["host"] ?? "");
    const port = Number(config["port"] ?? 443);
    const username = String(config["username"] ?? "admin");
    const password = String(config["password"] ?? "");
    const verifySsl = Boolean(config["verifySsl"] ?? false);

    const url = `https://${host}:${port}/rest/system/resource`;
    const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    const res = await this.httpRequest(url, "GET", { Authorization: authHeader }, undefined, verifySsl);
    return res.statusCode === 200;
  }

  async deploy(input: IDeployInput): Promise<IDeployResult> {
    const { certPem, keyPem, serverConfig } = input;
    const host = String(serverConfig["host"] ?? "");
    const port = Number(serverConfig["port"] ?? 443);
    const username = String(serverConfig["username"] ?? "admin");
    const password = String(serverConfig["password"] ?? "");
    const verifySsl = Boolean(serverConfig["verifySsl"] ?? false);

    const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    try {
      // 1. Import Certificate
      const certUrl = `https://${host}:${port}/rest/certificate/import`;
      const certBody = JSON.stringify({ "file-contents": certPem, name: "onlicert-cert" });
      const certRes = await this.httpRequest(certUrl, "POST", { Authorization: authHeader, "Content-Type": "application/json" }, certBody, verifySsl);

      // 2. Import Key
      const keyUrl = `https://${host}:${port}/rest/certificate/import`;
      const keyBody = JSON.stringify({ "file-contents": keyPem, name: "onlicert-cert" });
      await this.httpRequest(keyUrl, "POST", { Authorization: authHeader, "Content-Type": "application/json" }, keyBody, verifySsl);

      if (certRes.statusCode === 200) {
        return {
          success: true,
          message: "Certificado e chave privada importados com sucesso no MikroTik RouterOS.",
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          message: `Falha na API RouterOS (HTTP ${certRes.statusCode}): ${certRes.body}`,
          timestamp: new Date(),
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Erro ao conectar no RouterOS: ${(err as Error).message}`,
        timestamp: new Date(),
      };
    }
  }

  async verify(config: Record<string, unknown>): Promise<IVerifyResult> {
    const host = String(config["host"] ?? "");
    const port = Number(config["port"] ?? 443);
    const username = String(config["username"] ?? "admin");
    const password = String(config["password"] ?? "");
    const verifySsl = Boolean(config["verifySsl"] ?? false);

    const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    const url = `https://${host}:${port}/rest/certificate`;

    try {
      const res = await this.httpRequest(url, "GET", { Authorization: authHeader }, undefined, verifySsl);
      if (res.statusCode === 200) {
        return { success: true, message: "Lista de certificados recuperada com sucesso do RouterOS." };
      }
      return { success: false, message: `HTTP ${res.statusCode}` };
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

export default new MikrotikPlugin();
