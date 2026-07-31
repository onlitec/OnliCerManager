import { ipcMain } from "electron";
import { setupCAIpcHandlers } from "./ca.ipc";
import { setupCertificateIpcHandlers } from "./certificates.ipc";
import { setupServerIpcHandlers } from "./servers.ipc";
import { logger } from "../logger";

// Placeholder IPC handler setup - expanded in later phases
export function setupAllIpcHandlers(): void {
  // Register CA IPC Handlers
  setupCAIpcHandlers();
  // Register Certificate IPC Handlers
  setupCertificateIpcHandlers();
  // Register Server & Plugin IPC Handlers
  setupServerIpcHandlers();
  // OpenSSL version check
  ipcMain.handle("openssl:version", async () => {
    try {
      const { OpenSSLWrapper } = await import("@onlicert/infrastructure");
      return await OpenSSLWrapper.version();
    } catch (error) {
      logger.error("Failed to get OpenSSL version", { error });
      return { version: "unknown", error: String(error) };
    }
  });

  // Settings handlers
  ipcMain.handle("settings:get", async (_event, key: string) => {
    logger.debug("settings:get", { key });
    // TODO: implement in Phase 4 with database
    return null;
  });

  ipcMain.handle("settings:set", async (_event, key: string, value: unknown) => {
    logger.debug("settings:set", { key, value });
    // TODO: implement in Phase 4 with database
    return { success: true };
  });

  logger.info("All IPC handlers registered");
}
