import { OpenSSLWrapper } from "../OpenSSLWrapper";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface SignCSRInput {
  csrPem: string;
  caCertPem: string;
  caKeyPem: string;
  caKeyPassword?: string;
  validityDays: number;
  san?: string[];
}

export class CACommand {
  /**
   * Sign a CSR using the local CA certificate and private key
   */
  static async signCSR(input: SignCSRInput): Promise<string> {
    const { csrPem, caCertPem, caKeyPem, caKeyPassword, validityDays, san } = input;

    const csrFile = join(tmpdir(), `ca_csr_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    const caCertFile = join(tmpdir(), `ca_sign_cert_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    const caKeyFile = join(tmpdir(), `ca_sign_key_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    let configFile: string | undefined;

    try {
      writeFileSync(csrFile, csrPem, "utf8");
      writeFileSync(caCertFile, caCertPem, "utf8");
      writeFileSync(caKeyFile, caKeyPem, { encoding: "utf8", mode: 0o600 });

      const args = [
        "x509",
        "-req",
        "-in",
        csrFile,
        "-days",
        String(validityDays),
        "-CA",
        caCertFile,
        "-CAkey",
        caKeyFile,
        "-CAcreateserial",
        "-sha256",
      ];

      if (caKeyPassword) {
        args.push("-passin", "env:ONLICERT_CA_KEY_PASS");
      }

      if (san && san.length > 0) {
        configFile = join(tmpdir(), `openssl_ext_${Date.now()}_${Math.random().toString(36).slice(2)}.cnf`);
        const extConfig = [
          "basicConstraints = CA:FALSE",
          "keyUsage = digitalSignature, keyEncipherment",
          "extendedKeyUsage = serverAuth, clientAuth",
          "subjectAltName = " + san.join(","),
        ].join("\n");
        writeFileSync(configFile, extConfig, "utf8");
        args.push("-extfile", configFile);
      }

      const result = await OpenSSLWrapper.runOrThrow(
        args,
        caKeyPassword ? { env: { ONLICERT_CA_KEY_PASS: caKeyPassword } } : undefined
      );
      return result.stdout;
    } finally {
      try {
        unlinkSync(csrFile);
        unlinkSync(caCertFile);
        unlinkSync(caKeyFile);
        if (configFile) unlinkSync(configFile);
      } catch {
        // ignore
      }
    }
  }
}
