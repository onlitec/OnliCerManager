import { describe, it, expect } from "vitest";
import { GenKeyCommand } from "./commands/GenKeyCommand";
import { ReqCommand } from "./commands/ReqCommand";
import { CACommand } from "./commands/CACommand";
import { X509Command } from "./commands/X509Command";
import { VerifyCommand } from "./commands/VerifyCommand";

describe("OpenSSL Commands Integration", () => {
  it("should generate RSA 2048 key pair", async () => {
    const key = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    expect(key).toContain("BEGIN PRIVATE KEY");
    const pubKey = await GenKeyCommand.getPublicKey(key);
    expect(pubKey).toContain("BEGIN PUBLIC KEY");
  });

  it("should generate ECC P256 key pair", async () => {
    const key = await GenKeyCommand.generatePrivateKey({ algorithm: "ECC_P256" });
    expect(key).toContain("BEGIN PRIVATE KEY");
  });

  it("should create a self-signed Root CA certificate", async () => {
    const caKey = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    const caCert = await ReqCommand.createSelfSignedCA({
      privateKeyPem: caKey,
      validityDays: 365,
      dn: {
        commonName: "Test Root CA",
        organization: "OnliCert Test",
        country: "BR",
      },
    });

    expect(caCert).toContain("BEGIN CERTIFICATE");

    const metadata = await X509Command.parseMetadata(caCert);
    expect(metadata.subject).toContain("Test Root CA");
    expect(metadata.issuer).toContain("Test Root CA");
    expect(metadata.validTo).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("should issue and verify a leaf certificate signed by Root CA", async () => {
    // 1. Root CA
    const caKey = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    const caCert = await ReqCommand.createSelfSignedCA({
      privateKeyPem: caKey,
      validityDays: 365,
      dn: { commonName: "Test Root CA" },
    });

    // 2. Leaf CSR
    const leafKey = await GenKeyCommand.generatePrivateKey({ algorithm: "RSA_2048" });
    const leafCSR = await ReqCommand.createCSR({
      privateKeyPem: leafKey,
      dn: { commonName: "app.local" },
      san: ["DNS:app.local", "IP:192.168.1.100"],
    });
    expect(leafCSR).toContain("BEGIN CERTIFICATE REQUEST");

    // 3. CA Signs CSR
    const leafCert = await CACommand.signCSR({
      csrPem: leafCSR,
      caCertPem: caCert,
      caKeyPem: caKey,
      validityDays: 90,
      san: ["DNS:app.local", "IP:192.168.1.100"],
    });

    expect(leafCert).toContain("BEGIN CERTIFICATE");

    // 4. Parse Metadata
    const metadata = await X509Command.parseMetadata(leafCert);
    expect(metadata.subject).toContain("app.local");

    // 5. Verify Certificate
    const verifyResult = await VerifyCommand.verifyCertificate(leafCert, caCert);
    expect(verifyResult.valid).toBe(true);
  });
});
