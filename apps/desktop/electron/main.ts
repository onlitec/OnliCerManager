import { app, BrowserWindow, shell, ipcMain, nativeTheme, Menu } from "electron";
import { join } from "path";
import { openManual } from "./manual";
import { setupAllIpcHandlers } from "./ipc";
import { logger } from "./logger";

// Disable GPU hardware acceleration for better compatibility
// app.disableHardwareAcceleration();

// Set app ID for Windows notifications
if (process.platform === "win32") {
  app.setAppUserModelId("com.onlicert.manager");
}

// Prevent app from being garbage collected
let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = join(__dirname, "../dist");

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
    backgroundColor: "#0f0f0f",
    // Vite copies public/ into dist/, which is what ships in the packaged app.
    icon: join(RENDERER_DIST, "icon.png"),
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Disable remote module
      webSecurity: true,
    },
  });

  // Show window when ready to prevent visual flash
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    if (process.env.NODE_ENV === "development") {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(join(RENDERER_DIST, "index.html"));
  }

  logger.info("Main window created");
}

// IPC: theme
ipcMain.handle("get-theme", () => nativeTheme.shouldUseDarkColors ? "dark" : "light");
ipcMain.handle("set-theme", (_event, theme: "dark" | "light" | "system") => {
  nativeTheme.themeSource = theme;
});

function createAppMenu() {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: "appMenu" as const }] : []),
    { role: "fileMenu" as const },
    { role: "editMenu" as const },
    { role: "viewMenu" as const },
    { role: "windowMenu" as const },
    {
      label: "Ajuda",
      submenu: [
        {
          label: "Manual do Usuário (PDF)",
          accelerator: "F1",
          // Shares openManual() with the Help menu in the UI so both go through
          // the same asar-extraction path.
          click: () => {
            void openManual();
          },
        },
        { type: "separator" },
        {
          label: "Sobre o OnliCert Manager",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("app:open-about");
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle
void app.whenReady().then(async () => {
  logger.info("App ready", { version: app.getVersion(), platform: process.platform });

  // Setup all IPC handlers
  setupAllIpcHandlers();

  // Create native menu
  createAppMenu();

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.info("App quitting");
    app.quit();
    mainWindow = null;
  }
});

// Security: prevent navigation to unknown protocols
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "file:" && !VITE_DEV_SERVER_URL?.startsWith(parsedUrl.origin)) {
      event.preventDefault();
      logger.warn("Blocked navigation to external URL", { url });
    }
  });
});
