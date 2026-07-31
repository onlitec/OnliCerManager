import { OpenSSLWrapper } from "../OpenSSLWrapper";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface CreatePKCS12Input {
  certPem: string;
  keyPem: string;
  keyPassword?: string;
  caCertPem?: string;
  exportPassword?: string;
}

export interface ParsePKCS12Result {
  certPem: string;
  keyPem: string;
  caCertPem?: string;
}

export class PKCS12Command {
  /**
   * Export certificate + private key (+ optional CA cert) to PKCS#12 (PFX/P12) buffer
   */
  static async exportToPKCS12(input: CreatePKCS12Input): Promise<Buffer> {
    const { certPem, keyPem, keyPassword, caCertPem, exportPassword = "" } = input;

    const certFile = join(tmpdir(), `pfx_cert_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    const keyFile = join(tmpdir(), `pfx_key_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    let caFile: string | undefined;

    try {
      writeFileSync(certFile, certPem, "utf8");
      writeFileSync(keyFile, keyPem, { encoding: "utf8", mode: 0o600 });

      const args = [
        "pkcs12",
        "-export",
        "-in",
        certFile,
        "-inkey",
        keyFile,
        "-passout",
        "env:ONLICERT_PFX_OUT_PASS",
      ];

      const env: Record<string, string> = { ONLICERT_PFX_OUT_PASS: exportPassword };

      if (keyPassword) {
        args.push("-passin", "env:ONLICERT_KEY_PASS");
        env.ONLICERT_KEY_PASS = keyPassword;
      }

      if (caCertPem) {
        caFile = join(tmpdir(), `pfx_ca_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
        writeFileSync(caFile, caCertPem, "utf8");
        args.push("-certfile", caFile);
      }

      const result = await OpenSSLWrapper.runOrThrow(args, { env });
      return result.stdoutBuffer;
    } finally {
      try {
        unlinkSync(certFile);
        unlinkSync(keyFile);
        if (caFile) unlinkSync(caFile);
      } catch {
        // ignore
      }
    }
  }
}
