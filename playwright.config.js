import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  outputDir: `test-results/run-${process.pid}`,
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', headless: true, trace: 'retain-on-failure', launchOptions: process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN, args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] } : {} },
  projects: [{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer: { command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI },
});
