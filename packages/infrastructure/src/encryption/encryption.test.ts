import { describe, it, expect } from "vitest";
import { AES256Service } from "./AES256Service";

describe("AES256Service Encryption", () => {
  it("should encrypt and decrypt sensitive strings with AES-256-GCM + scrypt", () => {
    const plaintext = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----";
    const password = "MySecretCAPassword123!";

    const encrypted = AES256Service.encrypt(plaintext, password);
    expect(encrypted).not.toBe(plaintext);
    expect(typeof encrypted).toBe("string");

    const decrypted = AES256Service.decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it("should fail decryption with incorrect password", () => {
    const plaintext = "TopSecretPassword";
    const password = "CorrectPassword123";

    const encrypted = AES256Service.encrypt(plaintext, password);
    expect(() => AES256Service.decrypt(encrypted, "WrongPassword")).toThrow("Decryption failed");
  });

  it("should verify password correctness", () => {
    const plaintext = "DatabaseSSHKey";
    const password = "ValidPassword123";

    const encrypted = AES256Service.encrypt(plaintext, password);
    expect(AES256Service.verify(encrypted, password)).toBe(true);
    expect(AES256Service.verify(encrypted, "InvalidPassword")).toBe(false);
  });
});
