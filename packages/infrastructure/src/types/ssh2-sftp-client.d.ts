declare module "ssh2-sftp-client" {
  import type { ConnectConfig } from "ssh2";

  export default class SFTPClient {
    connect(options: ConnectConfig): Promise<void>;
    mkdir(path: string, recursive?: boolean): Promise<string>;
    put(input: Buffer | string, remotePath: string): Promise<string>;
    chmod(remotePath: string, mode: number | string): Promise<string>;
    end(): Promise<void>;
  }
}
