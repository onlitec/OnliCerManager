import { describe, it, expect } from "vitest";
import { CertificateValidator } from "./CertificateValidator";

describe("CertificateValidator Unit Tests", () => {
  it("should validate a correct certificate entity", () => {
    const cert = {
      id: "cert-1",
      caId: "ca-1",
      name: "Web Server Cert",
      type: "server" as const,
      commonName: "app.local",
      san: ["app.local", "IP:192.168.1.100"],
      certPem: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
      keyEncrypted: "encrypted_key",
      algorithm: "RSA_2048" as const,
      validFrom: Math.floor(Date.now() / 1000) - 100,
      validTo: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      serial: "123456",
      status: "active" as const,
      isFavorite: false,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    const res = CertificateValidator.validate(cert);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("should detect invalid common name and expired date", () => {
    const cert = {
      id: "cert-invalid",
      caId: "ca-1",
      name: "Bad Cert",
      type: "server" as const,
      commonName: "", // Invalid
      san: [],
      certPem: "",
      keyEncrypted: "",
      algorithm: "RSA_2048" as const,
      validFrom: 1000,
      validTo: 2000, // Expired
      serial: "",
      status: "active" as const,
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const res = CertificateValidator.validate(cert);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});
