import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    (electron as any)({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: [
                "electron",
                "winston",
                "better-sqlite3",
                "ssh2",
                "ssh2-sftp-client",
                "fs",
                "path",
                "child_process",
                "crypto",
                "os",
                "util",
              ],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@electron": path.resolve(__dirname, "./electron"),
    },
  },
  // Don't bundle Node.js built-ins in renderer
  optimizeDeps: {
    exclude: ["electron"],
  },
});
