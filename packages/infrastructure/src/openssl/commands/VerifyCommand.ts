import { OpenSSLWrapper } from "../OpenSSLWrapper";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface VerifyResult {
  valid: boolean;
  message: string;
}

export class VerifyCommand {
  /**
   * Verify a leaf certificate against a CA certificate
   */
  static async verifyCertificate(certPem: string, caCertPem: string): Promise<VerifyResult> {
    const certFile = join(tmpdir(), `openssl_leaf_verify_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    const caFile = join(tmpdir(), `openssl_ca_verify_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);

    try {
      writeFileSync(certFile, certPem, "utf8");
      writeFileSync(caFile, caCertPem, "utf8");

      const args = ["verify", "-CAfile", caFile, certFile];
      const result = await OpenSSLWrapper.run(args);

      const isOK = result.success && result.stdout.includes(": OK");
      return {
        valid: isOK,
        message: result.stdout || result.stderr,
      };
    } finally {
      try {
        unlinkSync(certFile);
        unlinkSync(caFile);
      } catch {
        // ignore
      }
    }
  }
}
