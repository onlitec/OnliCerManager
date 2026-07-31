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
      if (colonIndex === -1) return { type: "dns" as SANType, value: s };
      const prefix = s.slice(0, colonIndex).toLowerCase();
      const value = s.slice(colonIndex + 1);
      const type: SANType =
        prefix === "ip" ? "ip" : prefix === "email" ? "email" : prefix === "uri" ? "uri" : "dns";
      return { type, value };
    });
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
