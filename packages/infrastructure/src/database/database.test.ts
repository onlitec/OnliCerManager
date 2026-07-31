import { describe, it, expect, beforeEach } from "vitest";
import { CARepository } from "./repositories/CARepository";
import { CertificateRepository } from "./repositories/CertificateRepository";
import { ServerRepository } from "./repositories/ServerRepository";
import type { CertificateAuthority, Certificate, Server } from "@onlicert/core";

// Mock SQLite Database for unit testing repositories without native binary dependencies
class MockDatabase {
  private tables: Record<string, any[]> = {
    certificate_authorities: [],
    certificates: [],
    servers: [],
  };

  prepare(sql: string) {
    const self = this;
    const lowerSql = sql.toLowerCase().trim();

    return {
      get(...args: any[]) {
        if (lowerSql.includes("from certificate_authorities") && lowerSql.includes("is_active = 1")) {
          return self.tables.certificate_authorities?.find((ca) => ca.is_active === 1);
        }
        if (lowerSql.includes("from certificate_authorities") && lowerSql.includes("id = ?")) {
          return self.tables.certificate_authorities?.find((ca) => ca.id === args[0]);
        }
        if (lowerSql.includes("from certificates") && lowerSql.includes("id = ?")) {
          return self.tables.certificates?.find((c) => c.id === args[0]);
        }
        if (lowerSql.includes("from servers") && lowerSql.includes("id = ?")) {
          return self.tables.servers?.find((s) => s.id === args[0]);
        }
        if (lowerSql.includes("select count(*)")) {
          return { c: self.tables.certificates?.length ?? 0 };
        }
        return undefined;
      },
      all(..._args: any[]) {
        if (lowerSql.includes("from certificates")) {
          return self.tables.certificates ?? [];
        }
        if (lowerSql.includes("from servers")) {
          return self.tables.servers ?? [];
        }
        return [];
      },
      run(params?: any) {
        if (lowerSql.includes("insert into certificate_authorities")) {
          self.tables.certificate_authorities?.push({
            id: params.id,
            name: params.name,
            common_name: params.commonName,
            cert_pem: params.certPem,
            key_enc: params.keyEncrypted,
            algorithm: params.algorithm,
            valid_from: params.validFrom,
            valid_to: params.validTo,
            is_active: params.isActive,
            created_at: params.createdAt,
            updated_at: params.updatedAt,
          });
        } else if (lowerSql.includes("insert into certificates")) {
          self.tables.certificates?.push({
            id: params.id,
            ca_id: params.caId,
            name: params.name,
            type: params.type,
            common_name: params.commonName,
            san_json: params.sanJson,
            cert_pem: params.certPem,
            key_enc: params.keyEncrypted,
            csr_pem: params.csrPem,
            algorithm: params.algorithm,
            valid_from: params.validFrom,
            valid_to: params.validTo,
            serial: params.serial,
            status: params.status,
            is_favorite: params.isFavorite,
            created_at: params.createdAt,
            updated_at: params.updatedAt,
          });
        } else if (lowerSql.includes("insert into servers")) {
          self.tables.servers?.push({
            id: params.id,
            name: params.name,
            type: params.type,
            host: params.host,
            port: params.port,
            username: params.username,
            auth_enc: params.authEncrypted,
            config_json: params.configJson,
            is_favorite: params.isFavorite,
            created_at: params.createdAt,
            updated_at: params.updatedAt,
          });
        } else if (lowerSql.includes("delete from certificates")) {
          const id = typeof params === "string" ? params : params?.id;
          self.tables.certificates = (self.tables.certificates ?? []).filter((c) => c.id !== id);
        } else if (lowerSql.includes("delete from servers")) {
          const id = typeof params === "string" ? params : params?.id;
          self.tables.servers = (self.tables.servers ?? []).filter((s) => s.id !== id);
        }
        return { changes: 1 };
      },
    };
  }

  transaction(fn: Function) {
    return (...args: any[]) => fn(...args);
  }
}

describe("Repositories Unit Tests (Mocked DB)", () => {
  let db: any;
  let caRepo: CARepository;
  let certRepo: CertificateRepository;
  let serverRepo: ServerRepository;

  beforeEach(() => {
    db = new MockDatabase();
    caRepo = new CARepository(db);
    certRepo = new CertificateRepository(db);
    serverRepo = new ServerRepository(db);
  });

  it("should save and retrieve a Root CA", () => {
    const ca: CertificateAuthority = {
      id: "ca-1",
      name: "Root CA",
      commonName: "OnliCert Root CA",
      certPem: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
      keyEncrypted: "encrypted_key_base64",
      algorithm: "RSA_4096",
      validFrom: 1700000000,
      validTo: 2000000000,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    caRepo.save(ca);
    const active = caRepo.getActive();
    expect(active).not.toBeNull();
    expect(active?.commonName).toBe("OnliCert Root CA");
    expect(active?.algorithm).toBe("RSA_4096");
  });

  it("should save, list, and delete certificates", () => {
    const cert: Certificate = {
      id: "cert-1",
      caId: "ca-1",
      name: "Web Server Cert",
      type: "server",
      commonName: "example.com",
      san: ["example.com", "www.example.com"],
      certPem: "PEM_CERT",
      keyEncrypted: "PEM_KEY_ENC",
      algorithm: "RSA_2048",
      validFrom: Math.floor(Date.now() / 1000) - 100,
      validTo: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      serial: "123456",
      status: "active",
      isFavorite: false,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    certRepo.save(cert);
    const listed = certRepo.list();
    expect(listed.length).toBe(1);
    expect(listed[0]?.commonName).toBe("example.com");

    const deleted = certRepo.delete("cert-1");
    expect(deleted).toBe(true);
  });

  it("should save and list target servers", () => {
    const server: Server = {
      id: "srv-1",
      name: "Proxmox Cluster",
      type: "proxmox",
      host: "192.168.1.50",
      port: 8006,
      username: "root",
      config: { verifySsl: false },
      isFavorite: true,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    serverRepo.save(server);
    const list = serverRepo.list();
    expect(list.length).toBe(1);
    expect(list[0]?.name).toBe("Proxmox Cluster");
    expect(list[0]?.type).toBe("proxmox");
  });
});
