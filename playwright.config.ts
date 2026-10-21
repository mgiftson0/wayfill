import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Persistent context with extension loaded is handled in fixtures
      },
    },
  ],
  webServer: {
    command: 'npx serve e2e/fixtures/pages -p 9876 --no-clipboard',
    url: 'http://localhost:9876',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});

export { extensionPath };
