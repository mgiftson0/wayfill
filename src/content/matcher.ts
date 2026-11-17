/**
 * Field matcher — scores DOM form fields against profile keys using:
 * 1. Autocomplete attribute (highest priority)
 * 2. Exact / fuzzy label text matching via synonym dictionary
 * 3. aria-label, placeholder, name, id attributes
 * 4. Nearby text in the DOM (label element, parent text nodes)
 *
 * Returns a MatchResult with a score 0-100 and the matched profile key.
 */
import { type ProfileKey, SYNONYMS, SYNONYM_FLAT } from './synonyms';

export interface MatchResult {
  key: ProfileKey;
  score: number;       // 0–100
  source: string;      // which attribute matched
}

// ── Autocomplete → ProfileKey map ──────────────────────────────────────────
const AUTOCOMPLETE_MAP: Record<string, ProfileKey> = {
  'given-name':          'firstName',
  'family-name':         'lastName',
  'name':                'fullName',
  'email':               'email',
  'tel':                 'phone',
  'tel-national':        'phone',
  'address-line1':       'address1',
  'address-line2':       'address2',
  'address-level2':      'city',
  'address-level1':      'state',
  'postal-code':         'zip',
  'country':             'country',
  'country-name':        'country',
  'organization':        'expCompany',
  'organization-title':  'expTitle',
  'url':                 'portfolio',
};

// ── Scoring constants ──────────────────────────────────────────────────────
const SCORE = {
  AUTOCOMPLETE_EXACT:  100,
  LABEL_EXACT:          90,
  SYNONYM_EXACT:        80,
  ARIA_EXACT:           75,
  PLACEHOLDER_EXACT:    65,
  NAME_EXACT:           60,
  ID_EXACT:             55,
  LABEL_PARTIAL:        40,
  SYNONYM_PARTIAL:      35,
  NEARBY_TEXT:          55,
};

// ── Normalise a string for comparison ─────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── CSS id/attr escaping (CSS.escape unavailable in some envs) ───────────
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
  // minimal: escape chars that break attribute selectors
  return s.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&').replace(/^\d/, '\\3$& ');
}

// ── Extract visible label text for an element ─────────────────────────────
function getLabelText(el: HTMLElement): string {
  // 1. Native labels (works for wrapping and explicit labels, including shadow roots).
  const nativeLabels = (el as HTMLInputElement).labels;
  if (nativeLabels?.length) return Array.from(nativeLabels).map((label) => label.textContent?.trim() ?? '').join(' ');
  // 2. <label for="id">
  if (el.id) {
    const tree = el.getRootNode() as Document | ShadowRoot;
    const label = tree.querySelector<HTMLLabelElement>(`label[for="${cssEscape(el.id)}"]`);
    if (label) return label.textContent?.trim() ?? '';
  }
  // 2. Wrapping <label>
  const parent = el.closest('label');
  if (parent) return parent.textContent?.replace(el.textContent ?? '', '').trim() ?? '';
  // 3. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const texts = labelledBy.split(/\s+/).map(id => el.ownerDocument.getElementById(id)?.textContent?.trim()).filter(Boolean);
    if (texts.length) return texts.join(' ');
  }
  // 4. Adjacent text node / sibling span/div
  const prev = el.previousElementSibling;
  if (prev && ['LABEL','SPAN','DIV','P','LEGEND'].includes(prev.tagName)) {
    return prev.textContent?.trim() ?? '';
  }
  // 5. Parent container text (strip input value)
  const container = el.parentElement;
  if (container) {
    return (container.textContent ?? '').replace(el.textContent ?? '', '').trim();
  }
  return '';
}

// ── Near-text extractor for nearby DOM context ─────────────────────────────
function getNearbyText(el: HTMLElement): string {
  const parts: string[] = [];
  const radioGroup = el.closest('[role="radiogroup"]');
  if (radioGroup) {
    const labelledBy = radioGroup.getAttribute('aria-labelledby');
    if (labelledBy) {
      parts.push(labelledBy.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)?.textContent?.trim() ?? '').join(' '));
    }
    const groupLabel = radioGroup.getAttribute('aria-label');
    if (groupLabel) parts.push(groupLabel);
  }
  // fieldset legend
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) parts.push(legend.textContent?.trim() ?? '');
  }
  // section heading
  let ancestor = el.parentElement;
  for (let i = 0; i < 4 && ancestor; i++, ancestor = ancestor.parentElement) {
    const heading = ancestor.querySelector('h1,h2,h3,h4,h5,h6');
    if (heading) { parts.push(heading.textContent?.trim() ?? ''); break; }
  }
  return parts.join(' ');
}

// ── Score a single text against synonym dictionary ─────────────────────────
function scoreSynonymMatch(text: string, baseScore: number): { key: ProfileKey; score: number } | null {
  const n = norm(text);
  if (!n) return null;

  // Exact match in flat synonym table
  const exactKey = SYNONYM_FLAT.get(n);
  if (exactKey) return { key: exactKey, score: baseScore };

  // Partial: text contains a synonym
  let bestKey: ProfileKey | null = null;
  let bestLen = 0;
  for (const [synonym, key] of SYNONYM_FLAT.entries()) {
    if (n.includes(synonym) && synonym.length > bestLen) {
      bestKey = key;
      bestLen = synonym.length;
    }
  }
  if (bestKey) return { key: bestKey, score: Math.round(baseScore * 0.55) };

  // Check canonical keys too
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    for (const s of synonyms) {
      if (n.includes(norm(s)) && norm(s).length > bestLen) {
        bestKey = key as ProfileKey;
        bestLen = norm(s).length;
      }
    }
  }
  if (bestKey) return { key: bestKey, score: Math.round(baseScore * 0.45) };

  return null;
}

// ── Main match function ────────────────────────────────────────────────────
export function matchField(el: HTMLElement): MatchResult | null {
  const candidates: Array<{ key: ProfileKey; score: number; source: string }> = [];

  function push(key: ProfileKey, score: number, source: string) {
    candidates.push({ key, score, source });
  }

  // 1. autocomplete
  const ac = el.getAttribute('autocomplete');
  if (ac) {
    const acKey = AUTOCOMPLETE_MAP[ac.toLowerCase()];
    if (acKey) push(acKey, SCORE.AUTOCOMPLETE_EXACT, 'autocomplete');
  }

  // 2. Label text
  const labelText = getLabelText(el);
  if (labelText) {
    const m = scoreSynonymMatch(labelText, SCORE.LABEL_EXACT);
    if (m) push(m.key, m.score, 'label');
  }

  // 3. aria-label
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  if (ariaLabel) {
    const m = scoreSynonymMatch(ariaLabel, SCORE.ARIA_EXACT);
    if (m) push(m.key, m.score, 'aria-label');
  }

  // 4. placeholder
  const placeholder = (el as HTMLInputElement).placeholder ?? '';
  if (placeholder) {
    const m = scoreSynonymMatch(placeholder, SCORE.PLACEHOLDER_EXACT);
    if (m) push(m.key, m.score, 'placeholder');
  }

  // 5. name attribute
  const name = el.getAttribute('name') ?? '';
  if (name) {
    // Convert camelCase/snake_case to words
    const humanName = name.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    const m = scoreSynonymMatch(humanName, SCORE.NAME_EXACT);
    if (m) push(m.key, m.score, 'name');
  }

  // 6. id attribute
  const id = el.id ?? '';
  if (id) {
    const humanId = id.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    const m = scoreSynonymMatch(humanId, SCORE.ID_EXACT);
    if (m) push(m.key, m.score, 'id');
  }

  // 7. Nearby text (section heading, fieldset legend)
  const nearby = getNearbyText(el);
  if (nearby) {
    const m = scoreSynonymMatch(nearby, SCORE.NEARBY_TEXT);
    if (m) push(m.key, m.score, 'nearby');
  }

  if (candidates.length === 0) return null;

  // Pick the highest-scoring match
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;
  return { key: best.key, score: best.score, source: best.source };
}

// ── Collect all fillable fields in a root (handles shadow DOM) ─────────────
const FILLABLE_SELECTORS = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="password"])',
  'textarea',
  'select',
  '[role="combobox"]',
  '[contenteditable="true"]',
].join(', ');

export function collectFillableFields(root: Document | ShadowRoot | Element = document): HTMLElement[] {
  const results: HTMLElement[] = [];
  const els = root.querySelectorAll<HTMLElement>(FILLABLE_SELECTORS);
  for (const el of els) {
    // Skip hidden, honeypot, payment fields
    if (isHoneypot(el) || isPaymentField(el)) continue;
    if (el.matches(':disabled, [aria-disabled="true"]') || el.closest('[hidden], [aria-hidden="true"]')) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    results.push(el);
  }
  // Recurse into shadow roots
  const shadowHosts = root.querySelectorAll('*');
  for (const host of shadowHosts) {
    if (host.shadowRoot) {
      results.push(...collectFillableFields(host.shadowRoot));
    }
  }
  return results;
}

function isHoneypot(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.position === 'absolute' && (parseInt(style.left) < -100 || parseInt(style.top) < -100)) return true;
  if (parseInt(style.width) === 0 || parseInt(style.height) === 0) return true;
  const name = (el.getAttribute('name') ?? '').toLowerCase();
  if (['honeypot','bot','spam','trap','url2','website2','email2'].includes(name)) return true;
  return false;
}

function isPaymentField(el: HTMLElement): boolean {
  const text = [
    el.getAttribute('name') ?? '',
    el.getAttribute('id') ?? '',
    el.getAttribute('autocomplete') ?? '',
  ].join(' ').toLowerCase();
  return /card.?number|cvv|ccv|cvc|expir|routing|account.?number|billing/.test(text);
}
