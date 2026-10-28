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
  // The sync chunk loads Firebase late. Prepare its packages together up front, so the dev server
  // doesn't find Firestore mid-session and serve it a second copy of firebase/app ("Service
  // firestore/lite is not available").
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore/lite'],
  },
  test: {
    // A zone with daylight saving, so date math is tested across clock changes wherever it runs.
    env: { TZ: 'America/New_York' },
    // Tests sit next to the module they cover. `.test.ts` is plain logic and runs in Node;
    // `.test.tsx` renders React with Testing Library in jsdom.
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node' } },
      {
        extends: true,
        test: { name: 'dom', include: ['src/**/*.test.tsx'], environment: 'jsdom', setupFiles: ['src/test/setup-dom.ts'] },
      },
    ],
  },
})
