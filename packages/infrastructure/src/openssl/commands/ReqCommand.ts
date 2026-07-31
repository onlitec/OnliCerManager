import { OpenSSLWrapper } from "../OpenSSLWrapper";
import { formatDNForOpenSSL } from "@onlicert/core";
import type { DistinguishedName } from "@onlicert/core";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface CreateCSRInput {
  privateKeyPem: string;
  keyPassword?: string;
  dn: DistinguishedName;
  san?: string[];
}

export interface CreateSelfSignedCAInput {
  privateKeyPem: string;
  keyPassword?: string;
  dn: DistinguishedName;
  validityDays: number;
}

export class ReqCommand {
  /**
   * Generate a Certificate Signing Request (CSR)
   */
  static async createCSR(input: CreateCSRInput): Promise<string> {
    const { privateKeyPem, keyPassword, dn, san } = input;
    const subject = formatDNForOpenSSL(dn);

    const keyFile = join(tmpdir(), `openssl_key_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    let configFile: string | undefined;

    try {
      writeFileSync(keyFile, privateKeyPem, { encoding: "utf8", mode: 0o600 });

      const args: string[] = ["req", "-new", "-subj", subject, "-key", keyFile];

      if (keyPassword) {
        args.push("-passin", "env:ONLICERT_KEY_PASS");
      }

      if (san && san.length > 0) {
        configFile = join(tmpdir(), `openssl_san_${Date.now()}_${Math.random().toString(36).slice(2)}.cnf`);
        const sanConfig = [
          "[req]",
          "distinguished_name = req_distinguished_name",
          "req_extensions = v3_req",
          "[req_distinguished_name]",
          "[v3_req]",
          "subjectAltName = " + san.join(","),
        ].join("\n");
        writeFileSync(configFile, sanConfig, "utf8");
        args.push("-config", configFile, "-reqexts", "v3_req");
      }

      const result = await OpenSSLWrapper.runOrThrow(
        args,
        keyPassword ? { env: { ONLICERT_KEY_PASS: keyPassword } } : undefined
      );
      return result.stdout;
    } finally {
      try {
        unlinkSync(keyFile);
        if (configFile) unlinkSync(configFile);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Generate a Self-Signed Root CA Certificate using openssl req -new -x509
   */
  static async createSelfSignedCA(input: CreateSelfSignedCAInput): Promise<string> {
    const { privateKeyPem, keyPassword, dn, validityDays } = input;
    const subject = formatDNForOpenSSL(dn);

    const keyFile = join(tmpdir(), `openssl_ca_key_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);
    const configFile = join(tmpdir(), `openssl_ca_${Date.now()}_${Math.random().toString(36).slice(2)}.cnf`);

    try {
      writeFileSync(keyFile, privateKeyPem, { encoding: "utf8", mode: 0o600 });

      const caConfig = [
        "[req]",
        "distinguished_name = req_distinguished_name",
        "x509_extensions = v3_ca",
        "[req_distinguished_name]",
        "[v3_ca]",
        "subjectKeyIdentifier = hash",
        "authorityKeyIdentifier = keyid:always,issuer",
        "basicConstraints = critical, CA:true",
        "keyUsage = critical, digitalSignature, cRLSign, keyCertSign",
      ].join("\n");

      writeFileSync(configFile, caConfig, "utf8");

      const args: string[] = [
        "req",
        "-new",
        "-x509",
        "-days",
        String(validityDays),
        "-subj",
        subject,
        "-config",
        configFile,
        "-extensions",
        "v3_ca",
        "-key",
        keyFile,
      ];

      if (keyPassword) {
        args.push("-passin", "env:ONLICERT_KEY_PASS");
      }

      const result = await OpenSSLWrapper.runOrThrow(
        args,
        keyPassword ? { env: { ONLICERT_KEY_PASS: keyPassword } } : undefined
      );
      return result.stdout;
    } finally {
      try {
        unlinkSync(keyFile);
        unlinkSync(configFile);
      } catch {
        // ignore
      }
    }
  }
}
