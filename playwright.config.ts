import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const session = process.env.MYFEED_E2E_SESSION || randomUUID();
process.env.MYFEED_E2E_SESSION = session;
export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5188',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    extraHTTPHeaders: { 'X-MyFeed-Test-Session': session },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5188/',
    reuseExistingServer: false,
    env: {
      MYFEED_DATA_DIR: join(tmpdir(), `myfeed-e2e-${session}`),
      MYFEED_E2E_SESSION: session,
      NODE_ENV: 'test',
    },
    timeout: 60000,
  },
});
