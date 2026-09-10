import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    hmr: false,
    proxy: {
      "/convex": {
        target: "http://127.0.0.1:3210",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/convex/, ""),
      },
    },
  },
});
