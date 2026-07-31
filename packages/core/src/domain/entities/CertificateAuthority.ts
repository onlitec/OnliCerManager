export type CAAlgorithm = "RSA_2048" | "RSA_4096" | "ECC_P256" | "ECC_P384" | "ECC_P521";

export interface CertificateAuthority {
  readonly id: string;
  readonly name: string;
  readonly commonName: string;
  readonly certPem: string;
  readonly keyEncrypted: string; // AES-256-GCM encrypted private key
  readonly algorithm: CAAlgorithm;
  readonly validFrom: number;
  readonly validTo: number;
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;

  // Distinguished Name fields
  readonly organization?: string;
  readonly organizationUnit?: string;
  readonly country?: string;
  readonly state?: string;
  readonly locality?: string;
  readonly email?: string;
}

export interface CreateCAInput {
  name: string;
  commonName: string;
  algorithm: CAAlgorithm;
  validityDays: number;
  password: string;
  organization?: string;
  organizationUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  email?: string;
}

export interface ImportCAInput {
  name: string;
  certPem: string;
  keyPem: string;
  password?: string; // password of imported key
  newPassword: string; // password to encrypt with
}
