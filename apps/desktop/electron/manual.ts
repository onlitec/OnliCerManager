import { app, shell } from "electron";
import { join, dirname, sep } from "path";
import { existsSync, copyFileSync, mkdirSync, statSync } from "fs";
import { logger } from "./logger";

const MANUAL_FILENAME = "manual_onlicert_manager.pdf";

/**
 * Locates the bundled PDF manual.
 *
 * Note that a hit here may be a path *inside* app.asar: Electron patches `fs`
 * so `existsSync` resolves archive members transparently.
 */
function findManual(): string | null {
  const candidates = [
    // Packaged: Vite copies public/ into dist/, which is inside the asar.
    join(app.getAppPath(), "dist", MANUAL_FILENAME),
    join(__dirname, "..", "dist", MANUAL_FILENAME),
    // Development.
    join(__dirname, "..", "public", MANUAL_FILENAME),
    join(app.getAppPath(), "public", MANUAL_FILENAME),
    join(process.cwd(), "apps/desktop/public", MANUAL_FILENAME),
    join(process.cwd(), "docs", MANUAL_FILENAME),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Returns a path the operating system can actually open.
 *
 * `shell.openPath` hands the path to the OS, which knows nothing about asar
 * archives — so a path inside app.asar produces "cannot find
 * ...\app.asar\dist\manual_onlicert_manager.pdf" even though the file is really
 * there. Archive members are therefore copied out to a real file first.
 */
export function getOpenableManualPath(): string | null {
  const source = findManual();
  if (source === null) return null;
  const insideArchive = source.includes(`app.asar${sep}`) || source.includes("app.asar/");
  if (!insideArchive) return source;

  const target = join(app.getPath("temp"), "onlicert-manual", MANUAL_FILENAME);

  try {
    // Re-copy when the sizes differ so an updated manual isn't masked by a
    // stale extraction from a previous version.
    if (!existsSync(target) || statSync(target).size !== statSync(source).size) {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
      logger.info("Extracted manual from asar", { target });
    }
    return target;
  } catch (error) {
    logger.error("Failed to extract the manual from the asar archive", { error });
    return null;
  }
}

/** Opens the manual in the system's default PDF viewer. */
export async function openManual(): Promise<{ success: boolean; path?: string; error?: string }> {
  const path = getOpenableManualPath();
  if (path === null) {
    logger.error("Manual PDF not found");
    return { success: false, error: "Arquivo do manual PDF não encontrado." };
  }

  const failure = await shell.openPath(path);
  if (failure) {
    logger.error("Failed to open the manual", { path, failure });
    return { success: false, error: failure };
  }

  logger.info("Opened user manual", { path });
  return { success: true, path };
}
