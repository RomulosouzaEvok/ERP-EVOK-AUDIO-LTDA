import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Workers paralelos do Vitest 4 quebram no Windows deste ambiente
    // ("Vitest failed to find the current suite"); execucao serial e estavel
    // e a suite e pequena o suficiente para nao haver impacto relevante.
    fileParallelism: false,
  },
})
