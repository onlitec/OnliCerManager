export type ServerType =
  | "proxmox"
  | "mikrotik"
  | "truenas"
  | "nginx"
  | "apache"
  | "traefik"
  | "docker"
  | "windows"
  | "linux";

export interface Server {
  readonly id: string;
  readonly name: string;
  readonly type: ServerType;
  readonly host: string;
  readonly port?: number;
  readonly username?: string;
  readonly authEncrypted?: string; // encrypted password or private key
  readonly config: Record<string, unknown>; // plugin-specific config
  readonly isFavorite: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CreateServerInput {
  name: string;
  type: ServerType;
  host: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  config?: Record<string, unknown>;
}
