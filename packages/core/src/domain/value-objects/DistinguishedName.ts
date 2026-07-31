export interface DistinguishedName {
  readonly commonName: string;
  readonly organization?: string;
  readonly organizationUnit?: string;
  readonly country?: string; // 2-letter ISO code
  readonly state?: string;
  readonly locality?: string;
  readonly email?: string;
}

/**
 * Format a Distinguished Name as an OpenSSL subject string
 * Example: /CN=example.com/O=Acme Corp/C=BR
 */
export function formatDNForOpenSSL(dn: DistinguishedName): string {
  const parts: string[] = [`/CN=${dn.commonName}`];
  if (dn.organization) parts.push(`/O=${dn.organization}`);
  if (dn.organizationUnit) parts.push(`/OU=${dn.organizationUnit}`);
  if (dn.country) parts.push(`/C=${dn.country}`);
  if (dn.state) parts.push(`/ST=${dn.state}`);
  if (dn.locality) parts.push(`/L=${dn.locality}`);
  if (dn.email) parts.push(`/emailAddress=${dn.email}`);
  return parts.join("");
}
