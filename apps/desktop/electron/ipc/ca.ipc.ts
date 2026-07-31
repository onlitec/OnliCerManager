import { ipcMain, app } from "electron";
import {
  DatabaseConnection,
  CARepository,
  AES256Service,
  GenKeyCommand,
  ReqCommand,
  X509Command,
} from "@onlicert/infrastructure";
import { CAService } from "@onlicert/core";
import type { CreateCAInput, ICAInfrastructure } from "@onlicert/core";
import { logger } from "../logger";

export function setupCAIpcHandlers(): void {
  const dataDir = app.getPath("userData");
  const db = DatabaseConnection.getInstance(dataDir);
  const repository = new CARepository(db);

  const infraAdapter: ICAInfrastructure = {
    generatePrivateKey: GenKeyCommand.generatePrivateKey,
    createSelfSignedCA: ReqCommand.createSelfSignedCA,
    encrypt: AES256Service.encrypt,
    decrypt: AES256Service.decrypt,
    parseMetadata: X509Command.parseMetadata,
  };

  const caService = new CAService(repository, infraAdapter);

  // Get active CA
  ipcMain.handle("ca:get", () => {
    try {
      return caService.getActiveCA();
    } catch (error) {
      logger.error("Failed to get active CA", { error });
      throw error;
    }
  });

  // Create new CA
  ipcMain.handle("ca:create", async (_event, input: CreateCAInput) => {
    try {
      logger.info("Creating new CA", { name: input.name, commonName: input.commonName });
      const ca = await caService.createCA(input);
      logger.info("CA created successfully", { id: ca.id, commonName: ca.commonName });
      return { success: true, ca };
    } catch (error) {
      logger.error("Failed to create CA", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  // Export CA cert
  ipcMain.handle("ca:export", () => {
    try {
      const activeCA = caService.getActiveCA();
      if (!activeCA) throw new Error("No active CA found");
      return { success: true, certPem: activeCA.certPem };
    } catch (error) {
      logger.error("Failed to export CA", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info("CA IPC handlers setup completed");
}
