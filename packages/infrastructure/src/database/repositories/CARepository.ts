import type Database from "better-sqlite3";
import type { CertificateAuthority, CAAlgorithm } from "@onlicert/core";

export interface CARecord {
  id: string;
  name: string;
  common_name: string;
  cert_pem: string;
  key_enc: string;
  algorithm: string;
  valid_from: number;
  valid_to: number;
  is_active: number;
  organization?: string | null;
  organization_unit?: string | null;
  country?: string | null;
  state?: string | null;
  locality?: string | null;
  email?: string | null;
  created_at: number;
  updated_at: number;
}

export class CARepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Get the active Certificate Authority
   */
  getActive(): CertificateAuthority | null {
    const row = this.db
      .prepare("SELECT * FROM certificate_authorities WHERE is_active = 1 LIMIT 1")
      .get() as CARecord | undefined;

    return row ? this.mapToEntity(row) : null;
  }

  /**
   * Get CA by ID
   */
  getById(id: string): CertificateAuthority | null {
    const row = this.db
      .prepare("SELECT * FROM certificate_authorities WHERE id = ?")
      .get(id) as CARecord | undefined;

    return row ? this.mapToEntity(row) : null;
  }

  /**
   * Save a new CA
   */
  save(ca: CertificateAuthority): void {
    const stmt = this.db.prepare(`
      INSERT INTO certificate_authorities (
        id, name, common_name, cert_pem, key_enc, algorithm,
        valid_from, valid_to, is_active, organization, organization_unit,
        country, state, locality, email, created_at, updated_at
      ) VALUES (
        @id, @name, @commonName, @certPem, @keyEncrypted, @algorithm,
        @validFrom, @validTo, @isActive, @organization, @organizationUnit,
        @country, @state, @locality, @email, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: ca.id,
      name: ca.name,
      commonName: ca.commonName,
      certPem: ca.certPem,
      keyEncrypted: ca.keyEncrypted,
      algorithm: ca.algorithm,
      validFrom: ca.validFrom,
      validTo: ca.validTo,
      isActive: ca.isActive ? 1 : 0,
      organization: ca.organization ?? null,
      organizationUnit: ca.organizationUnit ?? null,
      country: ca.country ?? null,
      state: ca.state ?? null,
      locality: ca.locality ?? null,
      email: ca.email ?? null,
      createdAt: ca.createdAt,
      updatedAt: ca.updatedAt,
    });
  }

  /**
   * Set a specific CA as active and deactivate all others
   */
  setActive(id: string): void {
    this.db.transaction(() => {
      this.db.prepare("UPDATE certificate_authorities SET is_active = 0").run();
      this.db.prepare("UPDATE certificate_authorities SET is_active = 1 WHERE id = ?").run(id);
    })();
  }

  /**
   * Delete a CA by ID
   */
  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM certificate_authorities WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private mapToEntity(row: CARecord): CertificateAuthority {
    return {
      id: row.id,
      name: row.name,
      commonName: row.common_name,
      certPem: row.cert_pem,
      keyEncrypted: row.key_enc,
      algorithm: row.algorithm as CAAlgorithm,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      isActive: Boolean(row.is_active),
      ...(row.organization ? { organization: row.organization } : {}),
      ...(row.organization_unit ? { organizationUnit: row.organization_unit } : {}),
      ...(row.country ? { country: row.country } : {}),
      ...(row.state ? { state: row.state } : {}),
      ...(row.locality ? { locality: row.locality } : {}),
      ...(row.email ? { email: row.email } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
