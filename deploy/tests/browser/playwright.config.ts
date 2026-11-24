import { defineConfig } from '@playwright/test'

// release-smoke.sh --browser provides BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD and SURVEY_ID.
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
