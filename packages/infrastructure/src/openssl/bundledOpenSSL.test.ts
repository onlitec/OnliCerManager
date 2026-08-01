import { describe, it, expect } from "vitest";
import { join } from "path";
import { existsSync } from "fs";
import { OpenSSLBinary } from "./OpenSSLBinary";
import { OpenSSLWrapper } from "./OpenSSLWrapper";

// Points at the packaged build so this exercises the real resolution path.
const PACKAGED_RESOURCES = join(
  __dirname,
  "../../../../apps/desktop/dist-release/win-unpacked/resources"
);

const canRun = process.platform === "win32" && existsSync(join(PACKAGED_RESOURCES, "openssl"));

describe.skipIf(!canRun)("bundled OpenSSL (packaged Windows build)", () => {
  it("resolve() prefers the bundled binary over anything on PATH", () => {
    Object.defineProperty(process, "resourcesPath", {
      value: PACKAGED_RESOURCES,
      configurable: true,
    });

    const resolved = OpenSSLBinary.resolve();
    expect(resolved).toBe(join(PACKAGED_RESOURCES, "openssl", "win32", "openssl.exe"));
    expect(OpenSSLBinary.getBundledConfigPath()).toBe(
      join(PACKAGED_RESOURCES, "openssl", "win32", "openssl.cnf")
    );
  });

  it("issues a certificate through the wrapper, which must inject OPENSSL_CONF", async () => {
    // `req` is the command that fails when OPENSSL_CONF is unset, because the
    // bundled build's compiled-in OPENSSLDIR points at the packager's machine.
    const version = await OpenSSLWrapper.version();
    expect(version.version).toContain("OpenSSL");

    const result = await OpenSSLWrapper.run([
      "req",
      "-new",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "-",
      "-days",
      "1",
      "-subj",
      "/CN=wrapper-check",
    ]);

    expect(result.stderr).not.toContain("openssl.cnf");
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("BEGIN CERTIFICATE");
  });
});
