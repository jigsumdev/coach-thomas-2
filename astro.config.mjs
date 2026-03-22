import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://academie-evolution.com",
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  integrations: [
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { force: true },
    build: {
      cssMinify: "lightningcss",
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
