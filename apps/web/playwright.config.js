import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './playwright',
  timeout: 120000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1600, height: 1200 },
    headless: true,
    screenshot: 'off',
  },
})
