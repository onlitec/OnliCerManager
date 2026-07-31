import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

// Type-safe IPC channel definitions
type IpcChannel =
  | "get-theme"
  | "set-theme"
  | "ca:create"
  | "ca:import"
  | "ca:export"
  | "ca:get"
  | "ca:backup"
  | "ca:restore"
  | "ca:change-password"
  | "cert:create"
  | "cert:list"
  | "cert:get"
  | "cert:stats"
  | "cert:renew"
  | "cert:revoke"
  | "cert:favorite"
  | "cert:delete"
  | "cert:export"
  | "cert:validate"
  | "cert:import"
  | "server:create"
  | "server:list"
  | "server:get"
  | "server:update"
  | "server:delete"
  | "server:test-connection"
  | "server:deploy"
  | "plugin:list"
  | "settings:get"
  | "settings:set"
  | "events:list"
  | "openssl:version";

type IpcListenChannel = "deploy:progress" | "openssl:output" | "app:update-available";

// Expose a safe, minimal API to the renderer process
const electronAPI = {
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },
  on: (channel: IpcListenChannel, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  off: (channel: IpcListenChannel, listener: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },
  platform: process.platform as NodeJS.Platform,
};

contextBridge.exposeInMainWorld("electron", electronAPI);

export type ElectronAPI = typeof electronAPI;
