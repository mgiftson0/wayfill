/**
 * Phase 4 – Filler engine unit tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveValue, fillForm } from '@/content/filler';
import { createBlankProfile } from '@/storage/profile-schema';
import type { Profile } from '@/storage/profile-schema';

// Create a test profile with all key fields populated
function makeTestProfile(): Profile {
  return {
    id: 'test-1',
    name: 'Test',
    jobType: 'Full-time',
    updatedAt: new Date().toISOString(),
    personal: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '5550001234',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
      linkedin: 'https://linkedin.com/in/janesmith',
      github: 'https://github.com/janesmith',
      summary: 'Experienced software engineer.',
    },
    education: [{
      id: 'edu-1',
      institution: 'MIT',
      degree: 'B.S.',
      field: 'Computer Science',
      gpa: '3.9',
    }],
    experience: [{
      id: 'exp-1',
      company: 'Acme Corp',
      title: 'Software Engineer',
      location: 'San Francisco, CA',
      description: 'Built microservices.',
    }],
    skills: ['TypeScript', 'React', 'Python'],
    certifications: ['AWS Solutions Architect'],
    languages: ['English', 'Spanish'],
    workAuth: { authorized: 'Yes', sponsorshipNow: 'No', sponsorshipFuture: 'No' },
    eeo: {
      gender: 'Decline to self-identify',
      race: 'Decline to self-identify',
      veteran: 'Decline to self-identify',
      disability: 'Decline to self-identify',
    },
    common: { backgroundCheck: 'Yes', previousEmployee: 'No' },
    internAvail: { hoursPerWeek: 40, relocation: 'Yes', workMode: 'Hybrid' },
    pay: { minimum: '80000', desired: '100000', currency: 'USD', period: 'annual' },
    qa: [],
  };
}

describe('resolveValue', () => {
  let profile: Profile;
  beforeEach(() => { profile = makeTestProfile(); });

  it('resolves basic personal fields', () => {
    expect(resolveValue('firstName', profile)).toBe('Jane');
    expect(resolveValue('lastName', profile)).toBe('Smith');
    expect(resolveValue('email', profile)).toBe('jane@example.com');
    expect(resolveValue('phone', profile)).toBe('5550001234');
  });

  it('constructs fullName from firstName + lastName', () => {
    expect(resolveValue('fullName', profile)).toBe('Jane Smith');
  });

  it('resolves education fields', () => {
    expect(resolveValue('eduInstitution', profile)).toBe('MIT');
    expect(resolveValue('eduDegree', profile)).toBe('B.S.');
    expect(resolveValue('eduField', profile)).toBe('Computer Science');
    expect(resolveValue('eduGpa', profile)).toBe('3.9');
  });

  it('resolves experience fields', () => {
    expect(resolveValue('expCompany', profile)).toBe('Acme Corp');
    expect(resolveValue('expTitle', profile)).toBe('Software Engineer');
  });

  it('resolves skills as comma-separated string', () => {
    expect(resolveValue('skills', profile)).toBe('TypeScript, React, Python');
  });

  it('resolves work auth fields', () => {
    expect(resolveValue('authorized', profile)).toBe('Yes');
    expect(resolveValue('sponsorshipNow', profile)).toBe('No');
  });

  it('resolves pay fields', () => {
    expect(resolveValue('salaryExpected', profile)).toBe('100000');
    expect(resolveValue('salaryMin', profile)).toBe('80000');
  });

  it('resolves hoursPerWeek as string', () => {
    expect(resolveValue('hoursPerWeek', profile)).toBe('40');
  });

  it('returns null for empty fields', () => {
    const blank = createBlankProfile();
    expect(resolveValue('firstName', blank)).toBeNull();
    expect(resolveValue('linkedin', blank)).toBeNull();
    expect(resolveValue('skills', blank)).toBeNull();
  });

  it('returns null for unknown key via default case', () => {
    // @ts-expect-error testing unknown key
    expect(resolveValue('nonExistentKey', profile)).toBeNull();
  });
});

describe('fillForm', () => {
  let profile: Profile;
  beforeEach(() => {
    document.body.innerHTML = '';
    profile = makeTestProfile();
  });

  it('fills a simple text input by label', () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label>
      <input id="fn" type="text" />
    `;
    const summary = fillForm(profile, document);
    const input = document.getElementById('fn') as HTMLInputElement;
    expect(input.value).toBe('Jane');
    expect(summary.filled).toBeGreaterThan(0);
  });

  it('fills email input', () => {
    document.body.innerHTML = `
      <label for="em">Email Address</label>
      <input id="em" type="email" autocomplete="email" />
    `;
    fillForm(profile, document);
    const input = document.getElementById('em') as HTMLInputElement;
    expect(input.value).toBe('jane@example.com');
  });

  it('fills select by matching option text', () => {
    document.body.innerHTML = `
      <label for="auth">Are you authorized to work in the US?</label>
      <select id="auth">
        <option value="">-- Select --</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    `;
    fillForm(profile, document);
    const select = document.getElementById('auth') as HTMLSelectElement;
    expect(select.value).toBe('Yes');
  });

  it('fills multiple fields and returns correct counts', () => {
    document.body.innerHTML = `
      <label for="f1">First Name</label><input id="f1" type="text" />
      <label for="f2">Last Name</label><input id="f2" type="text" />
      <label for="f3">Email</label><input id="f3" type="email" autocomplete="email" />
    `;
    const summary = fillForm(profile, document);
    expect(summary.filled + summary.review).toBeGreaterThanOrEqual(3);
  });

  it('skips hidden fields', () => {
    document.body.innerHTML = `
      <input type="hidden" name="csrf_token" value="abc" />
      <label for="vis">First Name</label>
      <input id="vis" type="text" />
    `;
    fillForm(profile, document);
    // Hidden input should not be filled
    const hidden = document.querySelector<HTMLInputElement>('[type="hidden"]')!;
    expect(hidden.value).toBe('abc'); // unchanged
  });
});
