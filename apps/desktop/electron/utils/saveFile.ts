import { dialog, BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";
import type { IpcMainInvokeEvent } from "electron";

export interface SaveFileResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

/** Characters that are reserved on Windows or awkward in a filename. */
const ILLEGAL_FILENAME_CHARS = new Set([
  "<", ">", ":", '"', "/", "\\", "|", "?", "*", " ", "\t", "\r", "\n",
]);

/**
 * Make a certificate's Common Name safe to use as a default filename — a CN may
 * legitimately contain `*` (wildcard certs), `/`, or `:`, none of which a
 * filesystem will accept.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = Array.from(name)
    // Anything below U+0020 is a control character, which Windows rejects outright.
    .map((char) => (char < " " || ILLEGAL_FILENAME_CHARS.has(char) ? "_" : char))
    .join("")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 120)
    .trim();
  return cleaned.length > 0 ? cleaned : "certificate";
}

/**
 * Prompt the user for a destination and write `contents` there.
 *
 * Anchored to the window that made the request so the dialog is modal to it
 * rather than floating free.
 */
export async function saveTextToFile(
  event: IpcMainInvokeEvent,
  options: {
    title: string;
    defaultFileName: string;
    contents: string;
    filters: Electron.FileFilter[];
    /** Restrictive mode for files containing private key material. */
    mode?: number;
  }
): Promise<SaveFileResult> {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  const dialogOptions: Electron.SaveDialogOptions = {
    title: options.title,
    defaultPath: options.defaultFileName,
    filters: options.filters,
  };

  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || result.filePath === undefined) {
    return { success: false, canceled: true };
  }

  await writeFile(
    result.filePath,
    options.contents,
    options.mode !== undefined ? { encoding: "utf8", mode: options.mode } : { encoding: "utf8" }
  );

  return { success: true, filePath: result.filePath };
}
