export type SANType = "dns" | "ip" | "email" | "uri";

export interface SubjectAlternativeName {
  readonly type: SANType;
  readonly value: string;
}

/**
 * Parse a raw SAN string into typed SAN objects.
 * Format: "DNS:example.com,IP:192.168.1.1,email:user@example.com"
 */
export function parseSANs(raw: string): SubjectAlternativeName[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const colonIndex = s.indexOf(":");
      if (colonIndex === -1) return { type: "dns", value: s };
      const prefix = s.slice(0, colonIndex).toLowerCase();
      const value = s.slice(colonIndex + 1);
      const type: SANType =
        prefix === "ip" ? "ip" : prefix === "email" ? "email" : prefix === "uri" ? "uri" : "dns";
      return { type, value };
    });
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

/** True for a literal IP address, which must be emitted as `IP:` not `DNS:`. */
export function isIpAddress(value: string): boolean {
  if (IPV4.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  // Any colon-containing value here is an IPv6 literal: SAN type prefixes are
  // stripped before this is called.
  return value.includes(":");
}

/**
 * Guarantee the Common Name is also present as a SAN.
 *
 * Browsers have ignored CN for host verification since Chrome 58 — a
 * certificate whose CN is absent from the SAN list is rejected outright with
 * ERR_CERT_COMMON_NAME_INVALID, however valid it looks elsewhere. Issuing one
 * is never what the user wanted, so this is enforced here rather than left to
 * whichever UI happens to be calling.
 */
export function ensureCommonNameInSANs(
  commonName: string,
  sans: SubjectAlternativeName[]
): SubjectAlternativeName[] {
  const cn = commonName.trim();
  if (!cn) return sans;

  const alreadyPresent = sans.some(
    (s) => (s.type === "dns" || s.type === "ip") && s.value.toLowerCase() === cn.toLowerCase()
  );
  if (alreadyPresent) return sans;

  // Prepended so the CN is the primary identity in the extension.
  return [{ type: isIpAddress(cn) ? "ip" : "dns", value: cn }, ...sans];
}

/**
 * Format SAN objects to OpenSSL subjectAltName extension format
 */
export function formatSANsForOpenSSL(sans: SubjectAlternativeName[]): string {
  const prefixMap: Record<SANType, string> = {
    dns: "DNS",
    ip: "IP",
    email: "email",
    uri: "URI",
  };
  return sans.map((s) => `${prefixMap[s.type]}:${s.value}`).join(",");
}
