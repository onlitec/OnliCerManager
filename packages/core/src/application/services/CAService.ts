import { randomUUID } from "node:crypto";
import type { CertificateAuthority, CAAlgorithm, CreateCAInput } from "../../domain/entities/CertificateAuthority";

export interface ICAInfrastructure {
  generatePrivateKey(options: { algorithm: CAAlgorithm; password?: string }): Promise<string>;
  createSelfSignedCA(options: {
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
    validityDays: number;
  }): Promise<string>;
  encrypt(plaintext: string, password: string): string;
  decrypt(ciphertext: string, password: string): string;
  parseMetadata(certPem: string): Promise<{
    subject: string;
    issuer: string;
    serial: string;
    validFrom: number;
    validTo: number;
  }>;
}

export interface ICARepository {
  getActive(): CertificateAuthority | null;
  getById(id: string): CertificateAuthority | null;
  save(ca: CertificateAuthority): void;
  setActive(id: string): void;
  delete(id: string): boolean;
}

export class CAService {
  constructor(
    private readonly repository: ICARepository,
    private readonly infra: ICAInfrastructure
  ) {}

  /**
   * Create a new Root Certificate Authority
   */
  async createCA(input: CreateCAInput): Promise<CertificateAuthority> {
    const { name, commonName, algorithm, validityDays, password, organization, organizationUnit, country, state, locality, email } = input;

    // 1. Generate Private Key (plain PEM in memory)
    const privateKeyPem = await this.infra.generatePrivateKey({ algorithm });

    // 2. Generate Self-Signed CA Certificate
    const dn = {
      commonName,
      ...(organization ? { organization } : {}),
      ...(organizationUnit ? { organizationUnit } : {}),
      ...(country ? { country } : {}),
      ...(state ? { state } : {}),
      ...(locality ? { locality } : {}),
      ...(email ? { email } : {}),
    };

    const certPem = await this.infra.createSelfSignedCA({
      privateKeyPem,
      validityDays,
      dn,
    });

    // 3. Parse certificate metadata
    const meta = await this.infra.parseMetadata(certPem);

    // 4. Encrypt private key with user password (AES-256-GCM)
    const keyEncrypted = this.infra.encrypt(privateKeyPem, password);

    const now = Math.floor(Date.now() / 1000);
    const ca: CertificateAuthority = {
      id: `ca-${randomUUID()}`,
      name,
      commonName,
      certPem,
      keyEncrypted,
      algorithm,
      validFrom: meta.validFrom || now,
      validTo: meta.validTo || now + validityDays * 24 * 60 * 60,
      isActive: true,
      ...(organization ? { organization } : {}),
      ...(organizationUnit ? { organizationUnit } : {}),
      ...(country ? { country } : {}),
      ...(state ? { state } : {}),
      ...(locality ? { locality } : {}),
      ...(email ? { email } : {}),
      createdAt: now,
      updatedAt: now,
    };

    // 5. Save and set active
    this.repository.save(ca);
    this.repository.setActive(ca.id);

    return ca;
  }

  /**
   * Get the active Certificate Authority
   */
  getActiveCA(): CertificateAuthority | null {
    return this.repository.getActive();
  }

  /**
   * Decrypt and return the private key for signing operations
   */
  getCAPrivateKey(ca: CertificateAuthority, password: string): string {
    return this.infra.decrypt(ca.keyEncrypted, password);
  }

  /**
   * Change CA private key encryption password
   */
  changePassword(ca: CertificateAuthority, oldPassword: string, newPassword: string): CertificateAuthority {
    const plainKey = this.infra.decrypt(ca.keyEncrypted, oldPassword);
    const newEncryptedKey = this.infra.encrypt(plainKey, newPassword);

    const updatedCA: CertificateAuthority = {
      ...ca,
      keyEncrypted: newEncryptedKey,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    this.repository.save(updatedCA);
    return updatedCA;
  }
}
