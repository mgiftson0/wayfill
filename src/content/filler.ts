/**
 * Filler engine — writes values from a Profile into matched form fields.
 * Handles: text/email/tel/url inputs, textarea, select, radio, checkbox,
 * contenteditable, and React/Vue synthetic event dispatch.
 *
 * Returns a FillSummary with counts of filled / needs-review / skipped fields.
 */
import { type Profile } from '../storage/profile-schema';
import { matchField, collectFillableFields, type MatchResult } from './matcher';
import type { ProfileKey } from './synonyms';

export interface FillResult {
  element: HTMLElement;
  match: MatchResult;
  value: string;
  status: 'filled' | 'review' | 'skipped';
  reason?: string;
}

export interface FillSummary {
  filled: number;
  review: number;
  skipped: number;
  results: FillResult[];
}

// ── Profile value resolver ─────────────────────────────────────────────────
function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number') return String(v);
  return null;
}

export function resolveValue(key: ProfileKey, profile: Profile): string | null {
  const p = profile.personal;
  const w = profile.workAuth;
  const e = profile.eeo;
  const c = profile.common;
  const i = profile.internAvail;
  const pay = profile.pay;
  const edu0 = profile.education[0];
  const exp0 = profile.experience[0];

  switch (key) {
    case 'firstName':         return str(p.firstName);
    case 'lastName':          return str(p.lastName);
    case 'fullName':          return [p.firstName, p.lastName].filter(Boolean).join(' ') || null;
    case 'email':             return str(p.email);
    case 'phone':             return str(p.phone);
    case 'city':              return str(p.city);
    case 'state':             return str(p.state);
    case 'zip':               return str(p.zip);
    case 'country':           return str(p.country);
    case 'address1':          return str(p.address1);
    case 'address2':          return str(p.address2);
    case 'linkedin':          return str(p.linkedin);
    case 'github':            return str(p.github);
    case 'portfolio':         return str(p.portfolio);
    case 'website':           return str(p.portfolio) ?? str(p.otherLink);
    case 'summary':           return str(p.summary);
    case 'coverLetter':       return str(p.summary);

    case 'eduInstitution':    return str(edu0?.institution);
    case 'eduDegree':         return str(edu0?.degree);
    case 'eduField':          return str(edu0?.field);
    case 'eduGpa':            return str(edu0?.gpa);
    case 'eduStartDate':      return str(edu0?.startDate);
    case 'eduEndDate':        return str(edu0?.endDate);

    case 'expCompany':        return str(exp0?.company);
    case 'expTitle':          return str(exp0?.title);
    case 'expLocation':       return str(exp0?.location);
    case 'expStartDate':      return str(exp0?.startDate);
    case 'expEndDate':        return str(exp0?.endDate);
    case 'expDescription':    return str(exp0?.description);

    case 'skills':            return profile.skills.join(', ') || null;
    case 'certifications':    return profile.certifications.map(c => c.name).join(', ') || null;
    case 'languages':         return profile.languages.join(', ') || null;

    case 'authorized':        return str(w.authorized);
    case 'sponsorshipNow':    return str(w.sponsorshipNow);
    case 'sponsorshipFuture': return str(w.sponsorshipFuture);
    case 'visaType':          return str(w.visaType);
    case 'over18':            return str(w.over18);
    case 'clearance':         return str(w.clearance);

    case 'eeoGender':         return str(e.gender);
    case 'eeoRace':           return str(e.race);
    case 'eeoVeteran':        return str(e.veteran);
    case 'eeoDisability':     return str(e.disability);

    case 'previousEmployee':   return str(c.previousEmployee);
    case 'relativesAtCompany': return str(c.relativesAtCompany);
    case 'backgroundCheck':    return str(c.backgroundCheck);
    case 'drugTest':           return str(c.drugTest);
    case 'nonCompete':         return str(c.nonCompete);
    case 'referralSource':     return str(c.referralSource);
    case 'interviewAvailability': return str(c.interviewAvailability);
    case 'highestDegree':      return str(p.highestDegree);

    case 'salaryExpected':    return str(pay.desired);
    case 'salaryMin':         return str(pay.minimum);
    case 'salaryMax':         return str(pay.desired);
    case 'salaryPeriod':      return str(pay.period);

    case 'availableStart':    return str(i.startDate);
    case 'availableEnd':      return str(i.endDate);
    case 'hoursPerWeek':      return i.hoursPerWeek != null ? String(i.hoursPerWeek) : null;
    case 'relocation':        return str(i.relocation);
    case 'workMode':          return str(i.workMode);
    case 'travel':            return str(i.travel);

    case 'jobTitle':          return str(exp0?.title);
    case 'desiredRole':       return str(exp0?.title);

    default:                  return null;
  }
}

// ── Dispatch a native + React-compatible change event ─────────────────────
function nativeSet(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // React tracks the value through a descriptor — use the native setter
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value',
  )?.set;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value',
  )?.set;

  if (el.tagName === 'TEXTAREA' && nativeTextareaSetter) {
    nativeTextareaSetter.call(el, value);
  } else if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true }));
}

// ── Fill a <select> element ────────────────────────────────────────────────
function normalizeChoice(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function fillSelect(el: HTMLSelectElement, value: string): boolean {
  const norm = normalizeChoice(value);
  const options = Array.from(el.options).filter((option) => !option.disabled && option.value !== '');
  const exact = options.find((opt) => normalizeChoice(opt.text) === norm || normalizeChoice(opt.value) === norm);
  // Partial matches are safe only when they identify one option. This avoids
  // turning answers like "No" into "Not applicable" or "No preference".
  const partial = options.filter((opt) => {
    const text = normalizeChoice(opt.text);
    const val = normalizeChoice(opt.value);
    if ((norm === 'yes' || norm === 'no') && /^(?:no preference|not applicable|not specified)$/.test(text)) return false;
    return text.includes(norm) || norm.includes(text) || val.includes(norm) || norm.includes(val);
  });
  const selected = exact ?? (partial.length === 1 ? partial[0] : undefined);
  if (!selected) return false;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(el, selected.value);
  else el.value = selected.value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// ── Fill a radio group ─────────────────────────────────────────────────────
function fillRadio(el: HTMLInputElement, value: string, root: Document | Element): boolean {
  const norm = normalizeChoice(value);
  const name = el.name;
  const radios = name
    ? Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter((radio) => radio.name === name)
    : [el];
  const selected = radios.find((radio) => normalizeChoice(radio.value) === norm
    || normalizeChoice(Array.from(radio.labels ?? []).map((label) => label.textContent ?? '').join(' ')) === norm);
  if (!selected || selected.disabled) return false;
  if (!selected.checked) selected.click();
  if (!selected.checked) {
    selected.checked = true;
    selected.dispatchEvent(new Event('input', { bubbles: true }));
    selected.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return selected.checked;
}

// ── Fill a checkbox ────────────────────────────────────────────────────────
function fillCheckbox(el: HTMLInputElement, value: string): boolean {
  const shouldCheck = /^(yes|true|1|agree|consent)$/i.test(value.trim());
  if (el.checked !== shouldCheck) {
    el.click();
    if (el.checked !== shouldCheck) {
      el.checked = shouldCheck;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  return true;
}

// ── Fill contenteditable ───────────────────────────────────────────────────
function fillContenteditable(el: HTMLElement, value: string): boolean {
  el.focus();
  el.textContent = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true }));
  return true;
}

// ── Fill a combobox [role="combobox"] ─────────────────────────────────────
function fillCombobox(el: HTMLElement, value: string): boolean {
  // Try to find a hidden input or the actual input inside the combobox
  const input = el.querySelector<HTMLInputElement>('input');
  if (input) {
    nativeSet(input, value);
    // Trigger option selection via keyboard simulation
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // Try clicking a matching option in associated listbox
    const listboxId = el.getAttribute('aria-owns') ?? el.getAttribute('aria-controls');
    if (listboxId) {
      const listbox = document.getElementById(listboxId);
      if (listbox) {
        for (const option of Array.from(listbox.querySelectorAll('[role="option"]'))) {
          if (option.textContent?.toLowerCase().includes(value.toLowerCase())) {
            (option as HTMLElement).click();
            return true;
          }
        }
      }
    }
    return true;
  }
  return fillContenteditable(el, value);
}

// ── Main filler ────────────────────────────────────────────────────────────
export function fillForm(profile: Profile, root: Document | Element = document): FillSummary {
  const fields = collectFillableFields(root);
  const summary: FillSummary = { filled: 0, review: 0, skipped: 0, results: [] };
  const usedElements = new WeakSet<HTMLElement>();
  const processedRadioGroups = new Set<string | HTMLElement>();

  for (const el of fields) {
    if (usedElements.has(el)) continue;

    const match = matchField(el);
    if (!match) {
      summary.skipped++;
      continue;
    }

    // Skip low-confidence matches (< 25)
    if (match.score < 25) {
      summary.skipped++;
      continue;
    }

    const value = resolveValue(match.key, profile);
    if (!value) {
      summary.skipped++;
      continue;
    }

    let filled = false;
    const tag = el.tagName;
    const type = (el as HTMLInputElement).type?.toLowerCase() ?? '';

    if (tag === 'INPUT' && type === 'radio') {
      const radio = el as HTMLInputElement;
      const groupRoot = radio.closest<HTMLElement>('fieldset, [role="radiogroup"]');
      const groupKey: string | HTMLElement = radio.name ? `radio:${radio.name}` : groupRoot ?? radio;
      if (processedRadioGroups.has(groupKey)) continue;
      processedRadioGroups.add(groupKey);
    }

    try {
      if (el.getAttribute('contenteditable') === 'true') {
        filled = fillContenteditable(el, value);
      } else if (el.getAttribute('role') === 'combobox') {
        filled = fillCombobox(el, value);
      } else if (tag === 'SELECT') {
        filled = fillSelect(el as HTMLSelectElement, value);
      } else if (tag === 'INPUT' && type === 'radio') {
        filled = fillRadio(el as HTMLInputElement, value, root);
      } else if (tag === 'INPUT' && type === 'checkbox') {
        filled = fillCheckbox(el as HTMLInputElement, value);
      } else if (tag === 'INPUT' || tag === 'TEXTAREA') {
        nativeSet(el as HTMLInputElement | HTMLTextAreaElement, value);
        filled = true;
      }
    } catch (err) {
      console.warn('[wayfill] fill error', el, err);
    }

    if (filled) {
      // Needs review if score < 55 (partial match)
      const status: FillResult['status'] = match.score < 55 ? 'review' : 'filled';
      summary.results.push({ element: el, match, value, status });
      if (status === 'filled') summary.filled++;
      else summary.review++;
      usedElements.add(el);
    } else {
      summary.skipped++;
      summary.results.push({ element: el, match, value, status: 'skipped', reason: 'fill_failed' });
    }
  }

  return summary;
}

// ── Highlight filled fields ────────────────────────────────────────────────
export function highlightResults(results: FillResult[]) {
  for (const r of results) {
    const el = r.element;
    el.setAttribute('data-wayfill-status', r.status);
    el.style.outline = r.status === 'filled'
      ? '2px solid rgba(76,175,130,0.6)'
      : r.status === 'review'
        ? '2px solid rgba(212,168,75,0.6)'
        : '';
    el.style.outlineOffset = '2px';

    // Remove highlight after 3 seconds
    setTimeout(() => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    }, 3000);
  }
}
