import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Global setup: login Supabase sebelum semua test
    setupFiles: ['./tests/setup.ts'],
    // Jalankan test secara berurutan agar tidak ada race condition ke Supabase
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // Load .env.local secara otomatis
    env: (() => {
      try {
        const fs = require('fs')
        const lines = fs.readFileSync('.env.local', 'utf8').split('\n')
        const e: Record<string, string> = {}
        lines.forEach((l: string) => {
          const [k, ...v] = l.split('=')
          if (k && v.length) e[k.trim()] = v.join('=').trim()
        })
        return e
      } catch { return {} }
    })(),
    // Timeout lebih panjang karena test hit Supabase
    testTimeout: 30000,
    hookTimeout: 15000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/**', '.next/**', 'src/app/**'],
    },
  },
})
