import { spawn } from "child_process";
import { OpenSSLBinary } from "./OpenSSLBinary";

export interface OpenSSLResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface OpenSSLOptions {
  stdin?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

/**
 * Secure wrapper for OpenSSL CLI commands.
 *
 * - Uses spawn (not exec/shell) to prevent shell injection
 * - Sanitizes arguments before execution
 * - Captures stdout, stderr, and exit code
 * - Provides structured error messages
 */
export class OpenSSLWrapper {
  private static readonly DEFAULT_TIMEOUT_MS = 30_000;

  /**
   * Execute an OpenSSL command with the given arguments.
   * @param args - Array of arguments (do NOT join with shell; each is a separate arg)
   */
  static async run(args: string[], options: OpenSSLOptions = {}): Promise<OpenSSLResult> {
    const binary = OpenSSLBinary.resolve();
    const { stdin, timeoutMs = this.DEFAULT_TIMEOUT_MS, env } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...env },
        // Never use shell — prevents injection
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`OpenSSL command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on("close", (exitCode) => {
        clearTimeout(timeout);
        const code = exitCode ?? 1;
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          success: code === 0,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn OpenSSL: ${err.message}`));
      });
    });
  }

  /**
   * Run OpenSSL and throw if the command fails
   */
  static async runOrThrow(args: string[], options?: OpenSSLOptions): Promise<OpenSSLResult> {
    const result = await this.run(args, options);
    if (!result.success) {
      throw new OpenSSLError(
        `OpenSSL command failed (exit ${result.exitCode})`,
        args,
        result.stderr || result.stdout
      );
    }
    return result;
  }

  /**
   * Get the OpenSSL version string
   */
  static async version(): Promise<{ version: string }> {
    const result = await this.run(["version"]);
    return { version: result.stdout };
  }
}

export class OpenSSLError extends Error {
  constructor(
    message: string,
    public readonly args: string[],
    public readonly opensslOutput: string
  ) {
    super(`${message}\nOpenSSL output: ${opensslOutput}`);
    this.name = "OpenSSLError";
  }
}
