import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', timezoneId: 'America/Los_Angeles', browserName: 'chromium' },
  webServer: { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'raspberry-pi', use: { viewport: { width: 1024, height: 600 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 } },
  ],
})
