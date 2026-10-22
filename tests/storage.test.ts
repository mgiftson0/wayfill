/**
 * Phase 2 – Storage & Schema unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProfileSchema,
  createBlankProfile,
  EEOSchema,
} from '@/storage/profile-schema';
import { AppSettingsSchema } from '@/storage/settings-schema';

describe('ProfileSchema', () => {
  it('parses a blank profile with defaults', () => {
    const p = createBlankProfile('Internship');
    expect(p.jobType).toBe('Internship');
    expect(p.education).toEqual([]);
    expect(p.eeo.gender).toBe('Decline to self-identify');
    expect(p.pay.currency).toBe('USD');
  });

  it('rejects unknown job types', () => {
    const result = ProfileSchema.safeParse({ id: 'x', jobType: 'BadType' });
    expect(result.success).toBe(false);
  });

  it('stores skills as a string array', () => {
    const p = ProfileSchema.parse({
      id: 'a',
      skills: ['TypeScript', 'React'],
    });
    expect(p.skills).toEqual(['TypeScript', 'React']);
  });
});

describe('EEOSchema', () => {
  it('defaults all EEO fields to Decline', () => {
    const eeo = EEOSchema.parse({});
    expect(eeo.gender).toBe('Decline to self-identify');
    expect(eeo.race).toBe('Decline to self-identify');
    expect(eeo.veteran).toBe('Decline to self-identify');
    expect(eeo.disability).toBe('Decline to self-identify');
  });
});

describe('AppSettingsSchema', () => {
  it('parses empty object with defaults', () => {
    const s = AppSettingsSchema.parse({});
    expect(s.activeJobType).toBe('Full-time');
    expect(s.encryptionEnabled).toBe(false);
    expect(s).not.toHaveProperty('anthropicModel');
  });

  it('preserves site-enabled map', () => {
    const s = AppSettingsSchema.parse({ siteEnabled: { 'jobs.example.com': false } });
    expect(s.siteEnabled['jobs.example.com']).toBe(false);
  });
});

describe('Storage helpers (mock)', () => {
  beforeEach(() => {
    // Reset chrome mock storage between tests
    (chrome.storage.local as unknown as { _data: Record<string, unknown> })._data = {};
  });

  it('chrome mock is available', () => {
    expect(chrome.storage.local).toBeDefined();
  });
});
