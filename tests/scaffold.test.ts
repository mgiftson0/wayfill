/**
 * Phase 1 sanity test — verifies the test harness is wired correctly.
 * Real unit tests are added from Phase 3 onwards.
 */
import { describe, it, expect } from 'vitest';

describe('Wayfill Phase 1 – scaffold sanity', () => {
  it('chrome mock is available', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime).toBeDefined();
    expect(chrome.storage).toBeDefined();
  });

  it('storage mock returns empty object for missing keys', async () => {
    const result = await chrome.storage.local.get(['foo']);
    expect(result).toEqual({});
  });

  it('basic arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });
});
