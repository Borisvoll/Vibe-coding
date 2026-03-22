import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/Vibe-coding/' : '/',
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
  },
  test: {
    setupFiles: ['./tests/setup.js'],
  },
});
