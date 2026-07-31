import type Database from "better-sqlite3";
import type { Server, ServerType } from "@onlicert/core";

export interface ServerRecord {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number | null;
  username: string | null;
  auth_enc: string | null;
  config_json: string;
  is_favorite: number;
  created_at: number;
  updated_at: number;
}

export class ServerRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Get server by ID
   */
  getById(id: string): Server | null {
    const row = this.db
      .prepare("SELECT * FROM servers WHERE id = ?")
      .get(id) as ServerRecord | undefined;

    return row ? this.mapToEntity(row) : null;
  }

  /**
   * List all configured servers
   */
  list(): Server[] {
    const rows = this.db.prepare("SELECT * FROM servers ORDER BY name ASC").all() as ServerRecord[];
    return rows.map((r) => this.mapToEntity(r));
  }

  /**
   * Save a new server
   */
  save(server: Server): void {
    const stmt = this.db.prepare(`
      INSERT INTO servers (
        id, name, type, host, port, username, auth_enc, config_json,
        is_favorite, created_at, updated_at
      ) VALUES (
        @id, @name, @type, @host, @port, @username, @authEncrypted, @configJson,
        @isFavorite, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: server.id,
      name: server.name,
      type: server.type,
      host: server.host,
      port: server.port ?? null,
      username: server.username ?? null,
      authEncrypted: server.authEncrypted ?? null,
      configJson: JSON.stringify(server.config),
      isFavorite: server.isFavorite ? 1 : 0,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    });
  }

  /**
   * Delete server by ID
   */
  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM servers WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private mapToEntity(row: ServerRecord): Server {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(row.config_json) as Record<string, unknown>;
    } catch {
      config = {};
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type as ServerType,
      host: row.host,
      ...(row.port ? { port: row.port } : {}),
      ...(row.username ? { username: row.username } : {}),
      ...(row.auth_enc ? { authEncrypted: row.auth_enc } : {}),
      config,
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
