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
import { sanitizeFileName, saveTextToFile } from "../utils/saveFile";

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

  // Export CA cert (returns the PEM text, e.g. for copying to the clipboard)
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

  // Save the CA's public certificate to a file the user picks. This is the file
  // administrators install on client machines to trust the CA, so it is a
  // first-class action rather than just a clipboard copy.
  ipcMain.handle("ca:export-file", async (event) => {
    try {
      const activeCA = caService.getActiveCA();
      if (!activeCA) throw new Error("No active CA found");

      const result = await saveTextToFile(event, {
        title: "Exportar certificado da CA",
        defaultFileName: `${sanitizeFileName(activeCA.commonName)}.crt`,
        contents: activeCA.certPem,
        filters: [
          { name: "Certificado (PEM)", extensions: ["crt", "pem"] },
          { name: "Todos os arquivos", extensions: ["*"] },
        ],
      });

      if (result.success) {
        logger.info("CA certificate exported to file", { path: result.filePath });
      }
      return result;
    } catch (error) {
      logger.error("Failed to export CA to file", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info("CA IPC handlers setup completed");
}
