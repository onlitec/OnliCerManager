import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";

/**
 * SQLite database connection singleton.
 * Manages initialization and migrations.
 */
export class DatabaseConnection {
  private static instance: Database.Database | null = null;

  static getInstance(dataDir: string): Database.Database {
    if (this.instance) return this.instance;

    mkdirSync(dataDir, { recursive: true });
    const dbPath = join(dataDir, "onlicert.db");

    this.instance = new Database(dbPath, {
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    });

    // Enable WAL mode for better concurrent performance
    this.instance.pragma("journal_mode = WAL");
    this.instance.pragma("foreign_keys = ON");
    this.instance.pragma("synchronous = NORMAL");

    this.runMigrations(this.instance);

    return this.instance;
  }

  static close(): void {
    this.instance?.close();
    this.instance = null;
  }

  private static runMigrations(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

    const appliedVersions = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .pluck()
      .all() as number[];

    const migrations: { version: number; sql: string }[] = [
      { version: 1, sql: MIGRATION_V1 },
    ];

    for (const migration of migrations) {
      if (!appliedVersions.includes(migration.version)) {
        db.transaction(() => {
          db.exec(migration.sql);
          db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(migration.version);
        })();
      }
    }
  }
}

const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS certificate_authorities (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  common_name TEXT NOT NULL,
  cert_pem    TEXT NOT NULL,
  key_enc     TEXT NOT NULL,
  algorithm   TEXT NOT NULL,
  valid_from  INTEGER NOT NULL,
  valid_to    INTEGER NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  organization       TEXT,
  organization_unit  TEXT,
  country            TEXT,
  state              TEXT,
  locality           TEXT,
  email              TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS certificates (
  id          TEXT PRIMARY KEY,
  ca_id       TEXT REFERENCES certificate_authorities(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  common_name TEXT NOT NULL,
  san_json    TEXT NOT NULL DEFAULT '[]',
  cert_pem    TEXT NOT NULL,
  key_enc     TEXT NOT NULL,
  csr_pem     TEXT,
  algorithm   TEXT NOT NULL,
  valid_from  INTEGER NOT NULL,
  valid_to    INTEGER NOT NULL,
  serial      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_certs_ca_id ON certificates(ca_id);
CREATE INDEX IF NOT EXISTS idx_certs_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certs_valid_to ON certificates(valid_to);

CREATE TABLE IF NOT EXISTS servers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  host        TEXT NOT NULL,
  port        INTEGER,
  username    TEXT,
  auth_enc    TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS events (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  cert_id        TEXT,
  server_id      TEXT,
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'success',
  metadata_json  TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('theme', 'dark'),
  ('language', 'pt-BR'),
  ('expiry_warning_days', '30');
`;
