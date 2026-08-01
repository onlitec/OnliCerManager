import { describe, it, expect } from "vitest";
import {
  ensureCommonNameInSANs,
  formatSANsForOpenSSL,
  isIpAddress,
  parseSANs,
} from "./SubjectAlternativeName";

describe("isIpAddress", () => {
  it("recognises IPv4", () => {
    expect(isIpAddress("192.168.1.50")).toBe(true);
    expect(isIpAddress("10.0.0.1")).toBe(true);
  });

  it("rejects octets above 255", () => {
    expect(isIpAddress("999.1.1.1")).toBe(false);
  });

  it("recognises IPv6", () => {
    expect(isIpAddress("2001:db8::1")).toBe(true);
    expect(isIpAddress("::1")).toBe(true);
  });

  it("treats hostnames as not-IP", () => {
    expect(isIpAddress("cameras.onlitec.corp")).toBe(false);
    expect(isIpAddress("app.local")).toBe(false);
  });
});

describe("ensureCommonNameInSANs", () => {
  it("adds the Common Name when missing", () => {
    // Reproduces the real case: a certificate for cameras.onlitec.corp whose
    // SAN list held only the dialog's placeholder entries. Browsers verify the
    // hostname against SAN alone, so that certificate was unusable.
    const sans = parseSANs("DNS:app.local,IP:192.168.1.100");
    const result = ensureCommonNameInSANs("cameras.onlitec.corp", sans);

    expect(formatSANsForOpenSSL(result)).toBe(
      "DNS:cameras.onlitec.corp,DNS:app.local,IP:192.168.1.100"
    );
  });

  it("does not duplicate a Common Name that is already present", () => {
    const sans = parseSANs("DNS:cameras.onlitec.corp,DNS:alt.local");
    const result = ensureCommonNameInSANs("cameras.onlitec.corp", sans);

    expect(result).toHaveLength(2);
  });

  it("matches case-insensitively, as DNS does", () => {
    const sans = parseSANs("DNS:Cameras.OnliTec.Corp");
    expect(ensureCommonNameInSANs("cameras.onlitec.corp", sans)).toHaveLength(1);
  });

  it("uses the IP type for a Common Name that is an address", () => {
    const result = ensureCommonNameInSANs("192.168.1.50", []);
    expect(formatSANsForOpenSSL(result)).toBe("IP:192.168.1.50");
  });

  it("works from an empty SAN list", () => {
    const result = ensureCommonNameInSANs("cameras.onlitec.corp", []);
    expect(formatSANsForOpenSSL(result)).toBe("DNS:cameras.onlitec.corp");
  });

  it("leaves the list untouched for a blank Common Name", () => {
    const sans = parseSANs("DNS:alt.local");
    expect(ensureCommonNameInSANs("   ", sans)).toEqual(sans);
  });
});
