import type { Certificate } from "../entities/Certificate";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class CertificateValidator {
  /**
   * Validate a certificate against basic rules (expiry, SAN presence, etc.)
   */
  static validate(cert: Certificate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Check expiry
    if (cert.validTo < now) {
      errors.push("Certificate has expired");
    } else if (cert.validTo - now < 30 * 24 * 60 * 60) {
      warnings.push("Certificate expires in less than 30 days");
    }

    // Check SAN
    if (cert.san.length === 0 && (cert.type === "server" || cert.type === "web_server")) {
      warnings.push("Server certificates should have at least one Subject Alternative Name");
    }

    // Check status
    if (cert.status === "revoked") {
      errors.push("Certificate has been revoked");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a certificate is expiring within a given number of days
   */
  static isExpiringSoon(cert: Certificate, withinDays = 30): boolean {
    const now = Math.floor(Date.now() / 1000);
    const thresholdSeconds = withinDays * 24 * 60 * 60;
    return cert.validTo - now < thresholdSeconds && cert.validTo > now;
  }

  /**
   * Get days remaining until certificate expiry
   */
  static daysUntilExpiry(cert: Certificate): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.ceil((cert.validTo - now) / (24 * 60 * 60));
  }
}
