import { ipcMain, app } from "electron";
import {
  DatabaseConnection,
  CertificateRepository,
  CARepository,
  AES256Service,
  GenKeyCommand,
  ReqCommand,
  CACommand,
  X509Command,
  PKCS12Command,
  type CertFilter,
} from "@onlicert/infrastructure";
import { CertificateService } from "@onlicert/core";
import type { CreateCertificateInput, ICertificateInfrastructure } from "@onlicert/core";
import { logger } from "../logger";

export function setupCertificateIpcHandlers(): void {
  const dataDir = app.getPath("userData");
  const db = DatabaseConnection.getInstance(dataDir);
  const certRepo = new CertificateRepository(db);
  const caRepo = new CARepository(db);

  const infraAdapter: ICertificateInfrastructure = {
    generatePrivateKey: GenKeyCommand.generatePrivateKey,
    createCSR: ReqCommand.createCSR,
    signCSR: CACommand.signCSR,
    parseMetadata: X509Command.parseMetadata,
    exportToPKCS12: PKCS12Command.exportToPKCS12,
    pemToDer: X509Command.pemToDer,
    encrypt: AES256Service.encrypt,
    decrypt: AES256Service.decrypt,
  };

  const certService = new CertificateService(certRepo, caRepo, infraAdapter);

  // List certificates
  ipcMain.handle("cert:list", (_event, filter?: CertFilter) => {
    try {
      return certService.listCertificates(filter);
    } catch (error) {
      logger.error("Failed to list certificates", { error });
      throw error;
    }
  });

  // Get certificate stats
  ipcMain.handle("cert:stats", () => {
    try {
      return certService.getStats();
    } catch (error) {
      logger.error("Failed to get certificate stats", { error });
      throw error;
    }
  });

  // Create certificate
  ipcMain.handle("cert:create", async (_event, input: CreateCertificateInput, caPassword?: string) => {
    try {
      logger.info("Issuing certificate", { name: input.name, commonName: input.commonName, type: input.type });
      const cert = await certService.issueCertificate(input, caPassword);
      logger.info("Certificate issued successfully", { id: cert.id, serial: cert.serial });
      return { success: true, certificate: cert };
    } catch (error) {
      logger.error("Failed to issue certificate", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  // Revoke certificate
  ipcMain.handle("cert:revoke", (_event, id: string) => {
    try {
      certService.revokeCertificate(id);
      return { success: true };
    } catch (error) {
      logger.error("Failed to revoke certificate", { id, error });
      return { success: false, error: (error as Error).message };
    }
  });

  // Toggle favorite
  ipcMain.handle("cert:favorite", (_event, id: string) => {
    try {
      const isFav = certService.toggleFavorite(id);
      return { success: true, isFavorite: isFav };
    } catch (error) {
      logger.error("Failed to toggle favorite", { id, error });
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete certificate
  ipcMain.handle("cert:delete", (_event, id: string) => {
    try {
      const deleted = certService.deleteCertificate(id);
      return { success: deleted };
    } catch (error) {
      logger.error("Failed to delete certificate", { id, error });
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info("Certificate IPC handlers setup completed");
}
