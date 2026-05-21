import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Nome do repositório no GitHub (usado como base path no GitHub Pages).
// Em dev (npm run dev) o base sempre fica "/" — só afeta produção.
const REPO_NAME = "tirzenix-vendas";

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${REPO_NAME}/` : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5173, open: true },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
}));
