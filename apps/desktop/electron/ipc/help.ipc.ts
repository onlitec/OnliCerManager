import { ipcMain, app, shell } from "electron";
import { join } from "path";
import { existsSync } from "fs";
import { logger } from "../logger";

export function setupHelpIpcHandlers(): void {
  const getManualPdfPath = (): string | null => {
    const possiblePaths = [
      join(__dirname, "../public/manual_onlicert_manager.pdf"),
      join(__dirname, "../dist/manual_onlicert_manager.pdf"),
      join(app.getAppPath(), "public/manual_onlicert_manager.pdf"),
      join(app.getAppPath(), "dist/manual_onlicert_manager.pdf"),
      join(process.cwd(), "apps/desktop/public/manual_onlicert_manager.pdf"),
      join(process.cwd(), "docs/manual_onlicert_manager.pdf"),
      join(process.cwd(), "public/manual_onlicert_manager.pdf"),
    ];

    for (const p of possiblePaths) {
      if (existsSync(p)) {
        return p;
      }
    }
    return null;
  };

  ipcMain.handle("help:open-manual", async () => {
    try {
      const pdfPath = getManualPdfPath();
      if (!pdfPath) {
        logger.error("Manual PDF file not found");
        return { success: false, error: "Arquivo do manual PDF não encontrado." };
      }
      logger.info("Opening user manual PDF", { pdfPath });
      const openResult = await shell.openPath(pdfPath);
      if (openResult) {
        logger.error("Failed to open manual PDF", { openResult });
        return { success: false, error: openResult };
      }
      return { success: true, path: pdfPath };
    } catch (error) {
      logger.error("Error opening manual PDF", { error });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("help:get-manual-path", () => {
    return getManualPdfPath();
  });

  logger.info("Help IPC handlers setup completed");
}
