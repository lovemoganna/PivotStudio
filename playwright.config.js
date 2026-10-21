import { defineConfig } from '@playwright/test';

const chromiumLaunch = process.env.CHROME_BIN ? {
  executablePath: process.env.CHROME_BIN,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {};

export default defineConfig({
  testDir: './tests/browser',
  outputDir: `test-results/run-${process.pid}`,
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5187', headless: true, trace: 'retain-on-failure' },
  // Runner-level CHROME_BIN must never override the WebKit executable.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: chromiumLaunch } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  // Keep acceptance isolated from the legacy smoke server on port 5173.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: !process.env.CI,
  },
});
