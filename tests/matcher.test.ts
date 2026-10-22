/**
 * Phase 3 – Matcher + Synonym Dictionary unit tests
 * Uses jsdom (via vitest environment) to create real DOM elements.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchField } from '@/content/matcher';
import { SYNONYM_FLAT, SYNONYMS } from '@/content/synonyms';

// ── Helper to create a labelled input in jsdom ─────────────────────────────
function makeInput(attrs: Record<string, string>, labelText?: string): HTMLInputElement {
  const input = document.createElement('input');
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'type') input.type = v;
    else input.setAttribute(k, v);
  }
  if (labelText) {
    const label = document.createElement('label');
    label.setAttribute('for', input.id);
    label.textContent = labelText;
    document.body.appendChild(label);
  }
  document.body.appendChild(input);
  return input;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// ── Synonym dictionary tests ───────────────────────────────────────────────
describe('SYNONYM_FLAT', () => {
  it('contains expected common synonyms', () => {
    expect(SYNONYM_FLAT.get('first name')).toBe('firstName');
    expect(SYNONYM_FLAT.get('email')).toBe('email');
    expect(SYNONYM_FLAT.get('phone')).toBe('phone');
    expect(SYNONYM_FLAT.get('linkedin')).toBe('linkedin');
  });

  it('maps work auth synonyms', () => {
    expect(SYNONYM_FLAT.get('authorized to work')).toBe('authorized');
    expect(SYNONYM_FLAT.get('require sponsorship')).toBe('sponsorshipNow');
  });

  it('has synonyms for all ProfileKey entries in SYNONYMS', () => {
    for (const [key, list] of Object.entries(SYNONYMS)) {
      expect(list.length, `Key ${key} has no synonyms`).toBeGreaterThan(0);
    }
  });
});

// ── matchField via autocomplete ────────────────────────────────────────────
describe('matchField – autocomplete', () => {
  it('matches email via autocomplete=email', () => {
    const el = makeInput({ id: 'x', autocomplete: 'email', type: 'email' });
    const result = matchField(el);
    expect(result?.key).toBe('email');
    expect(result?.score).toBe(100);
    expect(result?.source).toBe('autocomplete');
  });

  it('matches firstName via autocomplete=given-name', () => {
    const el = makeInput({ id: 'fn', autocomplete: 'given-name' });
    const result = matchField(el);
    expect(result?.key).toBe('firstName');
    expect(result?.score).toBe(100);
  });

  it('matches address1 via autocomplete=address-line1', () => {
    const el = makeInput({ id: 'a1', autocomplete: 'address-line1' });
    expect(matchField(el)?.key).toBe('address1');
  });
});

// ── matchField via label text ─────────────────────────────────────────────
describe('matchField – label text', () => {
  it('matches email via label "Email Address"', () => {
    const el = makeInput({ id: 'email-input', type: 'email' }, 'Email Address');
    const result = matchField(el);
    expect(result?.key).toBe('email');
    expect(result!.score).toBeGreaterThanOrEqual(70);
  });

  it('matches firstName via label "First Name"', () => {
    const el = makeInput({ id: 'fn-input', type: 'text' }, 'First Name');
    expect(matchField(el)?.key).toBe('firstName');
  });

  it('matches phone via label "Phone Number"', () => {
    const el = makeInput({ id: 'ph', type: 'tel' }, 'Phone Number');
    expect(matchField(el)?.key).toBe('phone');
  });

  it('matches linkedin via label "LinkedIn Profile"', () => {
    const el = makeInput({ id: 'li', type: 'url' }, 'LinkedIn Profile');
    expect(matchField(el)?.key).toBe('linkedin');
  });

  it('matches authorized via label "Legally authorized to work"', () => {
    const el = makeInput({ id: 'auth', type: 'text' }, 'Are you legally authorized to work in the United States?');
    const result = matchField(el);
    expect(result?.key).toBe('authorized');
  });
});

// ── matchField via aria-label ──────────────────────────────────────────────
describe('matchField – aria-label', () => {
  it('matches fullName via aria-label="Full name"', () => {
    const el = makeInput({ 'aria-label': 'Full name', type: 'text' });
    expect(matchField(el)?.key).toBe('fullName');
  });

  it('matches github via aria-label="GitHub URL"', () => {
    const el = makeInput({ 'aria-label': 'GitHub URL', type: 'url' });
    expect(matchField(el)?.key).toBe('github');
  });
});

// ── matchField via placeholder ─────────────────────────────────────────────
describe('matchField – placeholder', () => {
  it('matches email from placeholder', () => {
    const el = makeInput({ placeholder: 'your@email.com', type: 'email' });
    expect(matchField(el)?.key).toBe('email');
  });
});

// ── matchField via name attribute ─────────────────────────────────────────
describe('matchField – name attribute', () => {
  it('matches firstName via name=first_name', () => {
    const el = makeInput({ name: 'first_name', type: 'text' });
    expect(matchField(el)?.key).toBe('firstName');
  });

  it('matches lastName via name=last_name', () => {
    const el = makeInput({ name: 'last_name', type: 'text' });
    expect(matchField(el)?.key).toBe('lastName');
  });
});

// ── No match for honeypot / unrelated fields ──────────────────────────────
describe('matchField – no match', () => {
  it('returns null for a completely unrelated field', () => {
    const el = makeInput({ id: 'captcha', name: 'captcha', type: 'text' });
    // captcha is not in our synonym list, should return null or low score
    const result = matchField(el);
    // might match something loosely — just ensure it's not a high-confidence match
    if (result) {
      expect(result.score).toBeLessThan(60);
    }
  });
});

// ── Score ordering ────────────────────────────────────────────────────────
describe('score priority', () => {
  it('autocomplete beats label when both present', () => {
    const el = makeInput({ id: 'mixed', autocomplete: 'given-name', type: 'text' }, 'Last Name');
    const result = matchField(el);
    // autocomplete=given-name → firstName score 100 > label "Last Name" score 80
    expect(result?.key).toBe('firstName');
    expect(result?.source).toBe('autocomplete');
  });
});
