import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Cấu hình Vite chuẩn hóa quốc tế cho các ứng dụng React + TypeScript Fullstack
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false, // Giữ lại các thành phần server biên dịch song song nếu có
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
