import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * AES-256-GCM encryption service for protecting sensitive data at rest.
 * Uses scrypt for key derivation (more memory-hard than PBKDF2).
 *
 * Output format: base64(salt || iv || authTag || ciphertext)
 */
export class AES256Service {
  /**
   * Encrypt plaintext with a password.
   * Returns a base64-encoded string containing all necessary data for decryption.
   */
  static encrypt(plaintext: string, password: string): string {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = scryptSync(password, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Concatenate: salt | iv | authTag | ciphertext
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString("base64");
  }

  /**
   * Decrypt a base64-encoded ciphertext with the given password.
   * Throws if authentication fails (wrong password or tampered data).
   */
  static decrypt(encryptedBase64: string, password: string): string {
    const combined = Buffer.from(encryptedBase64, "base64");

    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error("Invalid encrypted data: too short");
    }

    let offset = 0;
    const salt = combined.subarray(offset, (offset += SALT_LENGTH));
    const iv = combined.subarray(offset, (offset += IV_LENGTH));
    const authTag = combined.subarray(offset, (offset += TAG_LENGTH));
    const ciphertext = combined.subarray(offset);

    const key = scryptSync(password, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch {
      throw new Error("Decryption failed: invalid password or corrupted data");
    }
  }

  /**
   * Verify that a password can decrypt the given ciphertext.
   */
  static verify(encryptedBase64: string, password: string): boolean {
    try {
      this.decrypt(encryptedBase64, password);
      return true;
    } catch {
      return false;
    }
  }
}
