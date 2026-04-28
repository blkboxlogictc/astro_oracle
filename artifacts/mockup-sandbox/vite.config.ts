import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use explicit port 5001 for consistent local development
const port = process.env.PORT ? Number(process.env.PORT) : 5001;

// Use default base path "/" if BASE_PATH env var is not set (for local development)
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "localhost",
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port: port + 1, // Use a different port for preview to avoid conflicts
    host: "localhost",
  },
});
