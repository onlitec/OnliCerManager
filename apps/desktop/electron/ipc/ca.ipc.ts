import { ipcMain, app } from "electron";
import { join } from "path";
import {
  DatabaseConnection,
  CARepository,
  AES256Service,
  GenKeyCommand,
  ReqCommand,
  X509Command,
} from "@onlicert/infrastructure";
import { CAService } from "@onlicert/core";
import type { CreateCAInput } from "@onlicert/core";
import { logger } from "../logger";

export function setupCAIpcHandlers(): void {
  const dataDir = app.getPath("userData");
  const db = DatabaseConnection.getInstance(dataDir);
  const repository = new CARepository(db);

  const infraAdapter = {
    generatePrivateKey: (opts: any) => GenKeyCommand.generatePrivateKey(opts),
    createSelfSignedCA: (opts: any) => ReqCommand.createSelfSignedCA(opts),
    encrypt: (text: string, pass: string) => AES256Service.encrypt(text, pass),
    decrypt: (text: string, pass: string) => AES256Service.decrypt(text, pass),
    parseMetadata: (pem: string) => X509Command.parseMetadata(pem),
  };

  const caService = new CAService(repository, infraAdapter);

  // Get active CA
  ipcMain.handle("ca:get", async () => {
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
  ipcMain.handle("ca:export", async () => {
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
