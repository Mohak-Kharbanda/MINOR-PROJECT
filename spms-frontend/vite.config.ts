import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      // Import shared constants/types straight from source (no build step).
      { find: /^@edutrack\/shared\/(.*)$/, replacement: path.resolve(__dirname, "../spms-shared/src/$1") },
    ],
  },
  server: {
    port: 5173,
    fs: { allow: [".."] },
    proxy: {
      "/api": { target: process.env.VITE_DEV_API_PROXY || "http://localhost:4000", changeOrigin: true },
    },
  },
  preview: { port: 4173 },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query", "axios"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
