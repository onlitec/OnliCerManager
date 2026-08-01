import { ipcMain } from "electron";
import { getOpenableManualPath, openManual } from "../manual";
import { logger } from "../logger";

export function setupHelpIpcHandlers(): void {
  ipcMain.handle("help:open-manual", async () => {
    try {
      return await openManual();
    } catch (error) {
      logger.error("Error opening manual PDF", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("help:get-manual-path", () => getOpenableManualPath());

  logger.info("Help IPC handlers setup completed");
}
