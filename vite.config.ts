/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Unit tests sit next to the module they cover.
    include: ['src/**/*.test.ts'],
    // A zone with daylight saving, so date math is tested across clock changes wherever it runs.
    env: { TZ: 'America/New_York' },
  },
})
