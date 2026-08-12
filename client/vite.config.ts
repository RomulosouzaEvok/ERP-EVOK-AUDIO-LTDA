import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Acesso via tunel Cloudflare (teste remoto): o host *.trycloudflare.com
    // precisa estar na lista, e o proxy torna a API mesma-origem — o browser
    // remoto nunca precisa alcançar localhost:5000 diretamente.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
})
