import { existsSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";

/**
 * Resolves the path to the OpenSSL binary.
 *
 * Priority:
 * 1. Bundled binary (resources/openssl/win32/openssl.exe on Windows)
 * 2. System PATH (Linux/macOS)
 */
export class OpenSSLBinary {
  private static _resolvedPath: string | null = null;

  static resolve(): string {
    if (this._resolvedPath) return this._resolvedPath;

    // 1. Try bundled binary (for Windows distribution)
    const bundledPath = this.getBundledPath();
    if (bundledPath && existsSync(bundledPath)) {
      this._resolvedPath = bundledPath;
      return bundledPath;
    }

    // 2. Try system PATH
    const systemPath = this.getSystemPath();
    if (systemPath) {
      this._resolvedPath = systemPath;
      return systemPath;
    }

    // Tailor the hint to the platform the user is actually on — a Windows user
    // being told to run `apt install` has no idea what to do next.
    const hint =
      process.platform === "win32"
        ? 'Install it with "winget install ShiningLight.OpenSSL.Light", or install Git for Windows (which includes OpenSSL), then reopen the app.'
        : process.platform === "darwin"
          ? 'Install it with "brew install openssl".'
          : 'On Ubuntu/Debian: "sudo apt install openssl". On RHEL/Fedora: "sudo dnf install openssl".';

    throw new Error(`OpenSSL não foi encontrado neste computador. ${hint}`);
  }

  private static getBundledPath(): string | null {
    if (process.platform !== "win32") return null;

    // When running from installed Electron app
    const resourcesPath = (process as { resourcesPath?: string }).resourcesPath ?? join(process.cwd(), "resources");
    const bundled = join(resourcesPath, "openssl", "win32", "openssl.exe");
    return bundled;
  }

  private static getSystemPath(): string | null {
    const candidates = process.platform === "win32"
      ? ["openssl.exe", "C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe"]
      : ["openssl", "/usr/bin/openssl", "/usr/local/bin/openssl", "/opt/homebrew/bin/openssl"];

    for (const candidate of candidates) {
      try {
        execFileSync(candidate, ["version"], { stdio: "pipe" });
        return candidate;
      } catch {
        // not found at this path
      }
    }
    return null;
  }

  static async getVersion(): Promise<string> {
    const binary = this.resolve();
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync(binary, ["version"]);
    return stdout.trim();
  }
}
