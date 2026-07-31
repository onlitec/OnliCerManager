/**
 * OnliCert Manager Plugin Interface
 *
 * Every deployment plugin (Proxmox, MikroTik, Nginx, etc.) must implement IPlugin.
 * This contract enables the plugin loader to discover, configure, and use plugins
 * in a uniform way.
 */

export interface IPluginMetadata {
  /** Unique identifier (e.g., 'proxmox', 'nginx', 'mikrotik') */
  readonly id: string;

  /** Human-readable plugin name (e.g., 'Proxmox VE') */
  readonly name: string;

  /** Semantic version (e.g., '1.0.0') */
  readonly version: string;

  /** SVG string or data URI for the plugin icon */
  readonly icon: string;

  /** Description shown in the UI */
  readonly description: string;

  /** JSON Schema-style field definitions for server configuration */
  readonly configSchema: IConfigField[];
}

export type ConfigFieldType = "text" | "password" | "number" | "boolean" | "select" | "textarea";

export interface IConfigField {
  /** Key used in the config object */
  readonly key: string;

  /** Label displayed in the UI */
  readonly label: string;

  /** Input type */
  readonly type: ConfigFieldType;

  /** Whether this field is required */
  readonly required: boolean;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Help text shown below the field */
  readonly hint?: string;

  /** Options for 'select' type */
  readonly options?: { value: string; label: string }[];

  /** Default value */
  readonly defaultValue?: string | number | boolean;
}

export interface IDeployInput {
  /** PEM-encoded certificate */
  certPem: string;

  /** PEM-encoded private key (decrypted) */
  keyPem: string;

  /** PEM-encoded CA certificate (optional) */
  caPem?: string;

  /** Plugin-specific server configuration */
  serverConfig: Record<string, unknown>;
}

export interface IDeployResult {
  success: boolean;
  message: string;
  details?: string;
  timestamp: Date;
}

export interface IVerifyResult {
  success: boolean;
  /** Installed certificate subject */
  subject?: string;
  /** Installed certificate expiry (Unix timestamp) */
  validTo?: number;
  message: string;
}

/**
 * The main plugin contract.
 * All plugin implementations must export a default object implementing this interface.
 */
export interface IPlugin {
  /** Plugin metadata */
  readonly metadata: IPluginMetadata;

  /**
   * Test connectivity to the server using the provided config.
   * @returns true if the connection was successful, throws on failure
   */
  testConnection(config: Record<string, unknown>): Promise<boolean>;

  /**
   * Deploy (install) a certificate on the target server.
   */
  deploy(input: IDeployInput): Promise<IDeployResult>;

  /**
   * Verify the currently installed certificate on the server.
   */
  verify(config: Record<string, unknown>): Promise<IVerifyResult>;
}
