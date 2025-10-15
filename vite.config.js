import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080", // Spring Boot
        changeOrigin: true,
        secure: false,
        // nếu BE mount ở gốc (không cần /api) thì bật dòng dưới:
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
