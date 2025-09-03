// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- IMPORT
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Make environment variables available to the frontend
      'process.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL || 'http://localhost:8000'),
    },
  })