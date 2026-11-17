/**
 * Phase 1 E2E smoke test.
 * Full coverage implemented in Phase 9.
 */
import { test, expect } from './fixtures/extension-fixture';

test('fixture page loads', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:9876/');
  await expect(page.locator('h1')).toHaveText('Wayfill E2E Fixture');
});
