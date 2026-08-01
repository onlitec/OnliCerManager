import type { ElectronAPI } from "../electron/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
  }

  /** Injected by Vite from package.json — see `define` in vite.config.ts. */
  const __APP_VERSION__: string;
}

export {};
