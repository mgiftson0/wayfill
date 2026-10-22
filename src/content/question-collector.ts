export interface AIQuestion {
  label: string;
  el?: HTMLElement;
  radios?: HTMLInputElement[];
  options?: string[];
}

const RESTRICTED_QUESTION =
  /\b(?:eeo|self[- ]?identif(?:ication|y)|race|ethnicity|gender|sex|sexual orientation|disability|veteran status|protected veteran|social security|ssn|bank account|account number|routing number|credit card|card number|security code|pin|password)\b/i;

export function collectAIQuestions(root: Document = document): AIQuestion[] {
  const results: AIQuestion[] = [];
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(
    'input[type="text"]:not([data-wayfill-status]):not([type="hidden"]), input[type="email"]:not([data-wayfill-status]), input[type="tel"]:not([data-wayfill-status]), textarea:not([data-wayfill-status])',
  ));

  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    if ((el as HTMLInputElement | HTMLTextAreaElement).value.trim()) continue;

    let label = '';
    if (el.id) {
      label = root.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim() ?? '';
    }
    if (!label) label = el.getAttribute('aria-label')?.trim() ?? '';
    if (!label) label = el.getAttribute('placeholder')?.trim() ?? '';
    if (!label) {
      const prev = el.previousElementSibling;
      if (prev) label = prev.textContent?.trim() ?? '';
    }
    if (!label || label.length < 4 || RESTRICTED_QUESTION.test(label)) continue;
    results.push({ label, el });
  }

  const groups = new Map<string | Element, HTMLInputElement[]>();
  for (const radio of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'))) {
    if (radio.disabled || radio.closest('[hidden]')) continue;
    const style = window.getComputedStyle(radio);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const group = radio.closest('fieldset, [role="radiogroup"]');
    const key = radio.name ? `name:${radio.name}` : group ?? `radio:${radio.id}`;
    const members = groups.get(key) ?? [];
    members.push(radio);
    groups.set(key, members);
  }

  for (const radios of groups.values()) {
    if (radios.some((radio) => radio.checked || radio.hasAttribute('data-wayfill-status'))) continue;
    const group = radios[0]?.closest('fieldset, [role="radiogroup"]');
    if (!group) continue;
    const label = getRadioQuestion(root, group);
    const options = radios.map(getRadioLabel).filter(Boolean);
    if (!label || label.length < 4 || RESTRICTED_QUESTION.test(label) || options.length < 2) continue;
    results.push({ label, radios, options });
  }

  return results;
}

export function getRadioLabel(radio: HTMLInputElement): string {
  const labels = radio.labels;
  if (labels?.length) return Array.from(labels).map((label) => label.textContent?.trim() ?? '').join(' ').trim();
  return radio.value.trim();
}

export function formatAIQuestion(question: AIQuestion): string {
  return question.options
    ? `${question.label}\nChoose exactly one option: ${question.options.join(' | ')}`
    : question.label;
}

function getRadioQuestion(root: Document, group: Element): string {
  const legend = group.querySelector(':scope > legend');
  if (legend?.textContent?.trim()) return legend.textContent.trim();
  const labelledBy = group.getAttribute('aria-labelledby');
  if (labelledBy) {
    const label = labelledBy.split(/\s+/)
      .map((id) => root.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (label) return label;
  }
  return group.getAttribute('aria-label')?.trim() ?? '';
}
