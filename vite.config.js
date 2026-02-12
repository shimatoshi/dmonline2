import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Termux環境での安定性のためminify設定を調整
    minify: false,
    sourcemap: false,
  },
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://100.92.81.88:8002',
        changeOrigin: true,
      },
    },
  },
})
