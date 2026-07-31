import { OpenSSLWrapper } from "../OpenSSLWrapper";
import type { CAAlgorithm } from "@onlicert/core";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface GenKeyOptions {
  algorithm: CAAlgorithm;
  password?: string;
}

export interface KeyPairResult {
  privateKeyPem: string;
  publicKeyPem: string;
}

export class GenKeyCommand {
  /**
   * Generate a private key (RSA 2048/4096 or ECC P256/P384/P521)
   */
  static async generatePrivateKey(options: GenKeyOptions): Promise<string> {
    const { algorithm, password } = options;
    const args: string[] = ["genpkey"];

    switch (algorithm) {
      case "RSA_2048":
        args.push("-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048");
        break;
      case "RSA_4096":
        args.push("-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:4096");
        break;
      case "ECC_P256":
        args.push("-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256");
        break;
      case "ECC_P384":
        args.push("-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-384");
        break;
      case "ECC_P521":
        args.push("-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-521");
        break;
    }

    if (password) {
      args.push("-aes256", "-pass", "env:ONLICERT_KEY_PASS");
    }

    const result = await OpenSSLWrapper.runOrThrow(
      args,
      password ? { env: { ONLICERT_KEY_PASS: password } } : undefined
    );
    return result.stdout;
  }

  /**
   * Extract public key from a private key PEM
   */
  static async getPublicKey(privateKeyPem: string, password?: string): Promise<string> {
    const keyFile = join(tmpdir(), `pkey_extract_${Date.now()}_${Math.random().toString(36).slice(2)}.pem`);

    try {
      writeFileSync(keyFile, privateKeyPem, { encoding: "utf8", mode: 0o600 });
      const args: string[] = ["pkey", "-in", keyFile, "-pubout"];
      if (password) {
        args.push("-passin", "env:ONLICERT_KEY_PASS");
      }

      const result = await OpenSSLWrapper.runOrThrow(
        args,
        password ? { env: { ONLICERT_KEY_PASS: password } } : undefined
      );
      return result.stdout;
    } finally {
      try {
        unlinkSync(keyFile);
      } catch {
        // ignore
      }
    }
  }
}
