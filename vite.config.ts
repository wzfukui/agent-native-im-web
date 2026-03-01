import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.44.43:9800',
        changeOrigin: true,
        ws: true,
      },
      '/files': {
        target: 'http://192.168.44.43:9800',
        changeOrigin: true,
      },
    },
  },
})
