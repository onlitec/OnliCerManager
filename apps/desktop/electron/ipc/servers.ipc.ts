import { ipcMain, app } from "electron";
import { randomUUID } from "node:crypto";
import {
  DatabaseConnection,
  ServerRepository,
  PluginRegistry,
  createCustomSSHPlugin,
  createNginxPlugin,
  createApachePlugin,
  createTraefikPlugin,
  createDockerPlugin,
  createTrueNASPlugin,
  createSambaPlugin,
  createLinuxGenericPlugin,
} from "@onlicert/infrastructure";
import { ProxmoxPlugin } from "@onlicert/plugin-proxmox";
import { MikrotikPlugin } from "@onlicert/plugin-mikrotik";
import type { Server } from "@onlicert/core";
import { logger } from "../logger";

export function setupServerIpcHandlers(): void {
  const dataDir = app.getPath("userData");
  const db = DatabaseConnection.getInstance(dataDir);
  const serverRepo = new ServerRepository(db);

  // Register Built-in & Preset Plugins
  const registry = PluginRegistry.getInstance();
  registry.register(new ProxmoxPlugin());
  registry.register(new MikrotikPlugin());
  registry.register(createCustomSSHPlugin());
  registry.register(createSambaPlugin());
  registry.register(createNginxPlugin());
  registry.register(createApachePlugin());
  registry.register(createTraefikPlugin());
  registry.register(createDockerPlugin());
  registry.register(createTrueNASPlugin());
  registry.register(createLinuxGenericPlugin());

  // List plugins
  ipcMain.handle("plugin:list", () => {
    return registry.list();
  });

  // List servers
  ipcMain.handle("server:list", () => {
    try {
      return serverRepo.list();
    } catch (error) {
      logger.error("Failed to list servers", { error });
      throw error;
    }
  });

  // Create server
  ipcMain.handle("server:create", (_event, serverInput: Omit<Server, "id" | "createdAt" | "updatedAt">) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const server: Server = {
        ...serverInput,
        id: `srv-${randomUUID()}`,
        createdAt: now,
        updatedAt: now,
      };

      serverRepo.save(server);
      logger.info("Server added successfully", { id: server.id, name: server.name, type: server.type });
      return { success: true, server };
    } catch (error) {
      logger.error("Failed to create server", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  // Test connection
  ipcMain.handle("server:test-connection", async (_event, pluginId: string, config: Record<string, unknown>) => {
    try {
      const plugin = registry.get(pluginId);
      if (!plugin) throw new Error(`Plugin '${pluginId}' não encontrado.`);

      const ok = await plugin.testConnection(config);
      return { success: ok, message: ok ? "Conexão estabelecida com sucesso!" : "Falha na conexão." };
    } catch (error) {
      logger.error("Failed to test connection", { pluginId, error });
      return { success: false, message: (error as Error).message };
    }
  });

  // Deploy certificate to server
  ipcMain.handle("server:deploy", async (_event, serverId: string, certPem: string, keyPem: string, caPem?: string) => {
    try {
      const server = serverRepo.getById(serverId);
      if (!server) throw new Error("Servidor não encontrado.");

      const plugin = registry.get(server.type);
      if (!plugin) throw new Error(`Plugin para o tipo '${server.type}' não encontrado.`);

      logger.info("Starting certificate deploy", { serverId, serverName: server.name, pluginId: plugin.metadata.id });

      const result = await plugin.deploy({
        certPem,
        keyPem,
        ...(caPem ? { caPem } : {}),
        serverConfig: server.config,
      });

      logger.info("Deploy completed", { serverId, success: result.success, message: result.message });
      return result;
    } catch (error) {
      logger.error("Failed to deploy certificate", { serverId, error });
      return { success: false, message: (error as Error).message, timestamp: new Date() };
    }
  });

  // Delete server
  ipcMain.handle("server:delete", (_event, id: string) => {
    try {
      const deleted = serverRepo.delete(id);
      return { success: deleted };
    } catch (error) {
      logger.error("Failed to delete server", { id, error });
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info("Server & Plugin IPC handlers setup completed");
}
