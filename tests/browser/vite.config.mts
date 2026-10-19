import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./fixture", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
  resolve: {
    alias: {
      "next/link": fileURLToPath(new URL("./fixture/link.tsx", import.meta.url)),
      "next/image": fileURLToPath(new URL("./fixture/image.tsx", import.meta.url)),
      "next/navigation": fileURLToPath(
        new URL("./fixture/navigation.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../../", import.meta.url)),
    },
  },
  esbuild: { jsx: "automatic" },
  server: {
    fs: { allow: [fileURLToPath(new URL("../../", import.meta.url))] },
  },
});
