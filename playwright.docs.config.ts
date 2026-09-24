import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './docs-tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174/tvist/',
    ...devices['Desktop Chrome'],
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : undefined,
  },
  webServer: {
    command: 'npm run docs:preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/tvist/',
    reuseExistingServer: !process.env.CI,
  },
})
