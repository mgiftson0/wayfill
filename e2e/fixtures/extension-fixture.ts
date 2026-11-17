/**
 * Playwright fixture for loading the Wayfill extension in a persistent Chromium context.
 * Full E2E tests implemented in Phase 9.
 */
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../../dist');
const executablePath = process.env['CHROME_PATH'];

export const test = base.extend<{ context: BrowserContext }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      ...(executablePath ? { executablePath } : {}),
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },
});

export const { expect } = base;
