export type CertificateType =
  | "server"
  | "client"
  | "code_signing"
  | "vpn"
  | "email"
  | "web_server";

export type CertificateStatus = "active" | "revoked" | "expired";

export type CertificateAlgorithm =
  | "RSA_2048"
  | "RSA_4096"
  | "ECC_P256"
  | "ECC_P384"
  | "ECC_P521";

export interface Certificate {
  readonly id: string;
  readonly caId: string;
  readonly name: string;
  readonly type: CertificateType;
  readonly commonName: string;
  readonly san: ReadonlyArray<string>;
  readonly certPem: string;
  readonly keyEncrypted: string;
  readonly csrPem?: string;
  readonly algorithm: CertificateAlgorithm;
  readonly validFrom: number; // Unix timestamp
  readonly validTo: number; // Unix timestamp
  readonly serial: string;
  readonly status: CertificateStatus;
  readonly isFavorite: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CreateCertificateInput {
  caId: string;
  name: string;
  type: CertificateType;
  commonName: string;
  san?: string[];
  algorithm: CertificateAlgorithm;
  validityDays: number;
  organization?: string;
  organizationUnit?: string;
  country?: string;
  state?: string;
  locality?: string;
  email?: string;
  password?: string; // for private key encryption
}
