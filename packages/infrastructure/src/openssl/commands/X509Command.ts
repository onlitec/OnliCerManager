import { OpenSSLWrapper } from "../OpenSSLWrapper";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface CertificateMetadata {
  subject: string;
  issuer: string;
  serial: string;
  validFrom: number; // Unix timestamp
  validTo: number; // Unix timestamp
  fingerprintSha256: string;
  san: string[];
}

export class X509Command {
  /**
   * Parse certificate metadata from PEM string
   */
  static async parseMetadata(certPem: string): Promise<CertificateMetadata> {
    const certFile = join(tmpdir(), `x509_parse_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);

    try {
      writeFileSync(certFile, certPem, "utf8");
      const args = [
        "x509",
        "-in",
        certFile,
        "-noout",
        "-subject",
        "-issuer",
        "-serial",
        "-dates",
        "-fingerprint",
        "-sha256",
        "-ext",
        "subjectAltName",
      ];
      const result = await OpenSSLWrapper.runOrThrow(args);
      const output = result.stdout;

      const subject = X509Command.extractField(output, "subject=");
      const issuer = X509Command.extractField(output, "issuer=");
      const serial = X509Command.extractField(output, "serial=");
      const notBeforeStr = X509Command.extractField(output, "notBefore=");
      const notAfterStr = X509Command.extractField(output, "notAfter=");
      const fingerprint = X509Command.extractField(output, "SHA256 Fingerprint=");

      const validFrom = notBeforeStr ? Math.floor(new Date(notBeforeStr).getTime() / 1000) : 0;
      const validTo = notAfterStr ? Math.floor(new Date(notAfterStr).getTime() / 1000) : 0;

      const san = X509Command.extractSANs(output);

      return {
        subject,
        issuer,
        serial,
        validFrom,
        validTo,
        fingerprintSha256: fingerprint,
        san,
      };
    } finally {
      try {
        unlinkSync(certFile);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Convert PEM certificate to DER (binary) format
   */
  static async pemToDer(certPem: string): Promise<Buffer> {
    const certFile = join(tmpdir(), `x509_pem_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    try {
      writeFileSync(certFile, certPem, "utf8");
      const args = ["x509", "-in", certFile, "-outform", "DER"];
      const result = await OpenSSLWrapper.runOrThrow(args);
      return result.stdoutBuffer;
    } finally {
      try {
        unlinkSync(certFile);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Convert DER (binary) certificate to PEM format
   */
  static async derToPem(derBuffer: Buffer): Promise<string> {
    const derFile = join(tmpdir(), `x509_der_${Date.now()}_${Math.random().toString(36).slice(2)}.der`);
    try {
      writeFileSync(derFile, derBuffer);
      const args = ["x509", "-inform", "DER", "-in", derFile, "-outform", "PEM"];
      const result = await OpenSSLWrapper.runOrThrow(args);
      return result.stdout;
    } finally {
      try {
        unlinkSync(derFile);
      } catch {
        // ignore
      }
    }
  }

  private static extractField(output: string, prefix: string): string {
    const line = output.split("\n").find((l) => l.trim().startsWith(prefix));
    return line ? line.trim().slice(prefix.length).trim() : "";
  }

  private static extractSANs(output: string): string[] {
    const sanIndex = output.indexOf("Subject Alternative Name:");
    if (sanIndex === -1) return [];
    const sanSection = output.slice(sanIndex);
    const dnsMatches = sanSection.match(/DNS:[^\s,]+/g) ?? [];
    const ipMatches = sanSection.match(/IP Address:[^\s,]+/g) ?? [];
    return [...dnsMatches, ...ipMatches];
  }
}
