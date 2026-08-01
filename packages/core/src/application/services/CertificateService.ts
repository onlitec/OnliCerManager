import { randomUUID } from "node:crypto";
import type { Certificate, CertificateAlgorithm, CreateCertificateInput } from "../../domain/entities/Certificate";
import { ensureCommonNameInSANs, formatSANsForOpenSSL, parseSANs } from "../../domain/value-objects/SubjectAlternativeName";
import type { ICARepository } from "./CAService";

export interface ICertificateRepository {
  getById(id: string): Certificate | null;
  list(filter?: { status?: string; type?: string; caId?: string; search?: string; isFavorite?: boolean }): Certificate[];
  getStats(expiringWithinDays?: number): { total: number; expiringSoon: number; expired: number };
  save(cert: Certificate): void;
  updateStatus(id: string, status: string): void;
  toggleFavorite(id: string): boolean;
  delete(id: string): boolean;
}

export interface ICertificateInfrastructure {
  generatePrivateKey(options: { algorithm: CertificateAlgorithm; password?: string }): Promise<string>;
  createCSR(options: {
    privateKeyPem: string;
    keyPassword?: string;
    dn: {
      commonName: string;
      organization?: string;
      organizationUnit?: string;
      country?: string;
      state?: string;
      locality?: string;
      email?: string;
    };
    san?: string[];
  }): Promise<string>;
  signCSR(options: {
    csrPem: string;
    caCertPem: string;
    caKeyPem: string;
    caKeyPassword?: string;
    validityDays: number;
    san?: string[];
  }): Promise<string>;
  parseMetadata(certPem: string): Promise<{
    subject: string;
    issuer: string;
    serial: string;
    validFrom: number;
    validTo: number;
    san: string[];
  }>;
  exportToPKCS12(options: {
    certPem: string;
    keyPem: string;
    keyPassword?: string;
    caCertPem?: string;
    exportPassword?: string;
  }): Promise<Buffer>;
  pemToDer(certPem: string): Promise<Buffer>;
  encrypt(plaintext: string, password: string): string;
  decrypt(ciphertext: string, password: string): string;
}

export class CertificateService {
  constructor(
    private readonly certRepo: ICertificateRepository,
    private readonly caRepo: ICARepository,
    private readonly infra: ICertificateInfrastructure
  ) {}

  /**
   * Issue a new digital certificate signed by the active Root CA
   */
  async issueCertificate(input: CreateCertificateInput, caPassword?: string): Promise<Certificate> {
    const { caId, name, type, commonName, san = [], algorithm, validityDays, organization, organizationUnit, country, state, locality, email, password } = input;

    // 1. Fetch active CA
    const ca = this.caRepo.getById(caId) ?? this.caRepo.getActive();
    if (!ca) {
      throw new Error("Nenhuma Autoridade Certificadora (CA) ativa encontrada. Crie uma CA primeiro.");
    }

    // 2. Decrypt CA private key
    if (!caPassword) {
      throw new Error("A senha da CA é obrigatória para assinar o certificado.");
    }
    const caKeyPem = this.infra.decrypt(ca.keyEncrypted, caPassword);

    // 3. Generate Leaf Private Key
    const leafKeyPem = await this.infra.generatePrivateKey({ algorithm });

    // 4. Format SANs for OpenSSL. The Common Name is always included: browsers
    //    verify the hostname against the SAN extension only, so a certificate
    //    without its CN there is rejected no matter how it was issued.
    const parsedSANs = ensureCommonNameInSANs(commonName, parseSANs(san.join(",")));
    const formattedSANs = formatSANsForOpenSSL(parsedSANs);
    const sanList = formattedSANs ? [formattedSANs] : [];

    // 5. Build DN
    const dn = {
      commonName,
      ...(organization ? { organization } : {}),
      ...(organizationUnit ? { organizationUnit } : {}),
      ...(country ? { country } : {}),
      ...(state ? { state } : {}),
      ...(locality ? { locality } : {}),
      ...(email ? { email } : {}),
    };

    // 6. Generate CSR
    const csrPem = await this.infra.createCSR({
      privateKeyPem: leafKeyPem,
      dn,
      san: sanList,
    });

    // 7. Sign CSR with Root CA
    const certPem = await this.infra.signCSR({
      csrPem,
      caCertPem: ca.certPem,
      caKeyPem,
      validityDays,
      san: sanList,
    });

    // 8. Parse Metadata
    const meta = await this.infra.parseMetadata(certPem);

    // 9. Encrypt leaf key (dedicated password if provided, otherwise the CA password)
    const leafKeyEncrypted = this.infra.encrypt(leafKeyPem, password ?? caPassword);

    const now = Math.floor(Date.now() / 1000);
    const certificate: Certificate = {
      id: `cert-${randomUUID()}`,
      caId: ca.id,
      name,
      type,
      commonName,
      // The effective list, not the caller's input — the CN is added above, and
      // the record should show what the certificate actually carries.
      san: formattedSANs ? formattedSANs.split(",") : [],
      certPem,
      keyEncrypted: leafKeyEncrypted,
      csrPem,
      algorithm,
      validFrom: meta.validFrom || now,
      validTo: meta.validTo || now + validityDays * 24 * 60 * 60,
      serial: meta.serial || String(Date.now()),
      status: "active",
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };

    this.certRepo.save(certificate);
    return certificate;
  }

  /**
   * List certificates with filters
   */
  listCertificates(filter?: { status?: string; type?: string; caId?: string; search?: string; isFavorite?: boolean }): Certificate[] {
    return this.certRepo.list(filter);
  }

  /**
   * Get stats for dashboard
   */
  getStats(expiringWithinDays = 30) {
    return this.certRepo.getStats(expiringWithinDays);
  }

  /**
   * Revoke certificate
   */
  revokeCertificate(id: string): void {
    this.certRepo.updateStatus(id, "revoked");
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(id: string): boolean {
    return this.certRepo.toggleFavorite(id);
  }

  /**
   * Delete certificate
   */
  deleteCertificate(id: string): boolean {
    return this.certRepo.delete(id);
  }
}
