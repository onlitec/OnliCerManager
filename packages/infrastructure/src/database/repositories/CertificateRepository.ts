import type Database from "better-sqlite3";
import type { Certificate, CertificateType, CertificateStatus, CertificateAlgorithm } from "@onlicert/core";

export interface CertRecord {
  id: string;
  ca_id: string | null;
  name: string;
  type: string;
  common_name: string;
  san_json: string;
  cert_pem: string;
  key_enc: string;
  csr_pem: string | null;
  algorithm: string;
  valid_from: number;
  valid_to: number;
  serial: string;
  status: string;
  is_favorite: number;
  created_at: number;
  updated_at: number;
}

export interface CertFilter {
  status?: CertificateStatus;
  type?: CertificateType;
  caId?: string;
  search?: string;
  isFavorite?: boolean;
}

export class CertificateRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Get certificate by ID
   */
  getById(id: string): Certificate | null {
    const row = this.db
      .prepare("SELECT * FROM certificates WHERE id = ?")
      .get(id) as CertRecord | undefined;

    return row ? this.mapToEntity(row) : null;
  }

  /**
   * List all certificates with optional filtering
   */
  list(filter: CertFilter = {}): Certificate[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (filter.status) {
      conditions.push("status = @status");
      params.status = filter.status;
    }

    if (filter.type) {
      conditions.push("type = @type");
      params.type = filter.type;
    }

    if (filter.caId) {
      conditions.push("ca_id = @caId");
      params.caId = filter.caId;
    }

    if (filter.isFavorite !== undefined) {
      conditions.push("is_favorite = @isFavorite");
      params.isFavorite = filter.isFavorite ? 1 : 0;
    }

    if (filter.search) {
      conditions.push("(name LIKE @search OR common_name LIKE @search OR san_json LIKE @search)");
      params.search = `%${filter.search}%`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM certificates ${whereClause} ORDER BY created_at DESC`;

    const rows = this.db.prepare(sql).all(params) as CertRecord[];
    return rows.map((r) => this.mapToEntity(r));
  }

  /**
   * Count total certificates and certificates expiring in the next N days
   */
  getStats(expiringWithinDays = 30): { total: number; expiringSoon: number; expired: number } {
    const now = Math.floor(Date.now() / 1000);
    const threshold = now + expiringWithinDays * 24 * 60 * 60;

    const total = (
      this.db.prepare("SELECT COUNT(*) as c FROM certificates").get() as { c: number }
    ).c;

    const expiringSoon = (
      this.db
        .prepare("SELECT COUNT(*) as c FROM certificates WHERE valid_to > ? AND valid_to <= ? AND status = 'active'")
        .get(now, threshold) as { c: number }
    ).c;

    const expired = (
      this.db
        .prepare("SELECT COUNT(*) as c FROM certificates WHERE valid_to <= ? OR status = 'expired'")
        .get(now) as { c: number }
    ).c;

    return { total, expiringSoon, expired };
  }

  /**
   * Save a new certificate
   */
  save(cert: Certificate): void {
    const stmt = this.db.prepare(`
      INSERT INTO certificates (
        id, ca_id, name, type, common_name, san_json, cert_pem, key_enc,
        csr_pem, algorithm, valid_from, valid_to, serial, status, is_favorite,
        created_at, updated_at
      ) VALUES (
        @id, @caId, @name, @type, @commonName, @sanJson, @certPem, @keyEncrypted,
        @csrPem, @algorithm, @validFrom, @validTo, @serial, @status, @isFavorite,
        @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: cert.id,
      caId: cert.caId,
      name: cert.name,
      type: cert.type,
      commonName: cert.commonName,
      sanJson: JSON.stringify(cert.san),
      certPem: cert.certPem,
      keyEncrypted: cert.keyEncrypted,
      csrPem: cert.csrPem ?? null,
      algorithm: cert.algorithm,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      serial: cert.serial,
      status: cert.status,
      isFavorite: cert.isFavorite ? 1 : 0,
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
    });
  }

  /**
   * Update certificate status
   */
  updateStatus(id: string, status: CertificateStatus): void {
    this.db
      .prepare("UPDATE certificates SET status = ?, updated_at = (unixepoch()) WHERE id = ?")
      .run(status, id);
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(id: string): boolean {
    const cert = this.getById(id);
    if (!cert) return false;
    const newFavorite = !cert.isFavorite;
    this.db
      .prepare("UPDATE certificates SET is_favorite = ?, updated_at = (unixepoch()) WHERE id = ?")
      .run(newFavorite ? 1 : 0, id);
    return newFavorite;
  }

  /**
   * Delete certificate by ID
   */
  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM certificates WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private mapToEntity(row: CertRecord): Certificate {
    let san: string[] = [];
    try {
      san = JSON.parse(row.san_json) as string[];
    } catch {
      san = [];
    }

    return {
      id: row.id,
      caId: row.ca_id ?? "",
      name: row.name,
      type: row.type as CertificateType,
      commonName: row.common_name,
      san,
      certPem: row.cert_pem,
      keyEncrypted: row.key_enc,
      ...(row.csr_pem ? { csrPem: row.csr_pem } : {}),
      algorithm: row.algorithm as CertificateAlgorithm,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      serial: row.serial,
      status: row.status as CertificateStatus,
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
