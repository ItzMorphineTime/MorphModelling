import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs let one build run from a domain root or a sub-path,
  // such as a GitHub Pages project site (https://<user>.github.io/<repo>/).
  base: "./",
  plugins: [react()],
  // three.js alone is ~700 kB minified, and the editor needs it on first paint.
  build: { chunkSizeWarningLimit: 1600 },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
