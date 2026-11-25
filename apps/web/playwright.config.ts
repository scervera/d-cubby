import { defineConfig } from '@playwright/test'

/**
 * Interface screenshots (npm run shots). Not a regression suite: it photographs every
 * screen in both themes at desktop and phone width so a design change can be reviewed.
 * It needs the app running (bin/dev) and writes to screenshots/, which is git-ignored.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 4,
  timeout: 240_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.SHOTS_BASE_URL || 'http://localhost:4080',
    browserName: 'chromium',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
})
