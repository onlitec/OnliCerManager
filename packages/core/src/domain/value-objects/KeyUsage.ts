export type KeyUsage =
  | "digitalSignature"
  | "nonRepudiation"
  | "keyEncipherment"
  | "dataEncipherment"
  | "keyAgreement"
  | "keyCertSign"
  | "cRLSign"
  | "encipherOnly"
  | "decipherOnly";

export type ExtendedKeyUsage =
  | "serverAuth"
  | "clientAuth"
  | "codeSigning"
  | "emailProtection"
  | "timeStamping"
  | "OCSPSigning";

export interface KeyUsageProfile {
  keyUsage: KeyUsage[];
  extendedKeyUsage: ExtendedKeyUsage[];
}

import type { CertificateType } from "../entities/Certificate";

/**
 * Returns the recommended key usage profile for a given certificate type
 */
export function getKeyUsageProfile(type: CertificateType): KeyUsageProfile {
  const profiles: Record<CertificateType, KeyUsageProfile> = {
    server: {
      keyUsage: ["digitalSignature", "keyEncipherment"],
      extendedKeyUsage: ["serverAuth"],
    },
    client: {
      keyUsage: ["digitalSignature"],
      extendedKeyUsage: ["clientAuth"],
    },
    web_server: {
      keyUsage: ["digitalSignature", "keyEncipherment"],
      extendedKeyUsage: ["serverAuth", "clientAuth"],
    },
    code_signing: {
      keyUsage: ["digitalSignature"],
      extendedKeyUsage: ["codeSigning"],
    },
    vpn: {
      keyUsage: ["digitalSignature", "keyAgreement"],
      extendedKeyUsage: ["serverAuth", "clientAuth"],
    },
    email: {
      keyUsage: ["digitalSignature", "nonRepudiation", "keyEncipherment"],
      extendedKeyUsage: ["emailProtection"],
    },
  };
  return profiles[type];
}
