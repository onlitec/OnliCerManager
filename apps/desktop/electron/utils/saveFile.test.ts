import { describe, it, expect } from "vitest";
import { sanitizeFileName } from "./saveFile";

describe("sanitizeFileName", () => {
  it("leaves an ordinary hostname untouched", () => {
    expect(sanitizeFileName("samba.onlitec.corp")).toBe("samba.onlitec.corp");
  });

  it("replaces the wildcard in a wildcard certificate's CN", () => {
    // `*` is legal in a CN but rejected by Windows in a filename.
    expect(sanitizeFileName("*.example.com")).toBe("example.com");
  });

  it("replaces path separators and reserved characters", () => {
    expect(sanitizeFileName('a/b\\c:d"e|f?g<h>i')).toBe("a_b_c_d_e_f_g_h_i");
  });

  it("collapses runs of replaced characters into a single underscore", () => {
    expect(sanitizeFileName("OnliCert   Local Root CA")).toBe("OnliCert_Local_Root_CA");
  });

  it("strips leading dots so the result is not a hidden file", () => {
    expect(sanitizeFileName("...hidden")).toBe("hidden");
  });

  it("replaces control characters", () => {
    const nul = String.fromCharCode(0);
    const unitSeparator = String.fromCharCode(31);
    expect(sanitizeFileName(`a${nul}b${unitSeparator}c`)).toBe("a_b_c");
  });

  it("falls back to a default when nothing usable remains", () => {
    expect(sanitizeFileName("///")).toBe("certificate");
    expect(sanitizeFileName("")).toBe("certificate");
  });

  it("truncates very long names", () => {
    expect(sanitizeFileName("a".repeat(300))).toHaveLength(120);
  });
});
