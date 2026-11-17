/**
 * Wayfill content script — injected into all pages.
 * Responsibilities:
 *   1. Detect if page looks like a job application
 *   2. Inject a floating "Fill" button
 *   3. Listen for messages from popup / service worker
 *   4. Run the filler engine and report results
 *   5. Observe DOM mutations for SPA navigation
 */
import { fillForm, highlightResults } from './filler';
import { getActiveProfile, patchSettings } from '../storage/storage';
import { loadSettings } from '../storage/storage';
import { collectFillableFields } from './matcher';
import { collectAIQuestions, formatAIQuestion, getRadioLabel } from './question-collector';

// ── Job-page heuristics ────────────────────────────────────────────────────
const JOB_PAGE_SIGNALS = [
  /apply|application|careers?|jobs?|greenhouse|lever|workday|icims|taleo|smartrecruiters|ashby/i,
];

function isJobPage(): boolean {
  const url = window.location.href + window.location.pathname;
  if (JOB_PAGE_SIGNALS.some((r) => r.test(url))) return true;
  // Check page text for apply button / job title pattern
  const bodyText = document.body.textContent?.slice(0, 3000) ?? '';
  const hasApplyKeywords = /submit (your )?application|apply now|apply for this (position|role|job)/i.test(bodyText);
  const hasFormFields = collectFillableFields(document).length >= 3;
  return hasApplyKeywords && hasFormFields;
}

// ── Floating button ────────────────────────────────────────────────────────
let floatingBtn: HTMLElement | null = null;

function injectFloatingButton() {
  if (floatingBtn && document.body.contains(floatingBtn)) return;
  if (!isJobPage()) return;

  const btn = document.createElement('div');
  btn.id = 'wayfill-fab';
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', 'Autofill with Wayfill');
  btn.setAttribute('tabindex', '0');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
    <span>wayfill</span>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #wayfill-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 16px;
      background: #161616;
      color: #efefef;
      border: 1px solid #2a2a2a;
      border-radius: 40px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 300;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      transition: background 0.15s, transform 0.15s, opacity 0.15s;
      user-select: none;
    }
    #wayfill-fab:hover {
      background: #1e1e1e;
      transform: translateY(-1px);
    }
    #wayfill-fab:active { transform: scale(0.97); }
    #wayfill-fab svg { width: 14px; height: 14px; }
    #wayfill-fab[data-filling] { opacity: 0.6; pointer-events: none; }
    #wayfill-fab.hidden { opacity: 0; pointer-events: none; transform: translateY(6px); }
    @media (prefers-color-scheme: light) {
      #wayfill-fab { background: #fafafa; color: #1a1a1a; border-color: #d0d0d0; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
      #wayfill-fab:hover { background: #f0f0f0; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(btn);
  floatingBtn = btn;

  btn.addEventListener('click', () => { void handleFill(); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleFill(); }
  });
}

// ── Fill handler ───────────────────────────────────────────────────────────
async function handleFill() {
  if (!floatingBtn) return;
  floatingBtn.setAttribute('data-filling', 'true');

  try {
    const [profile, settings] = await Promise.all([getActiveProfile(), loadSettings()]);
    const host = window.location.hostname;
    if (settings.siteEnabled[host] === false) {
      showToast('Wayfill is disabled for this site. Enable it in the extension popup.', 'warn');
      return;
    }

    const summary = fillForm(profile, document);
    const documentsAttached = await fillResumeUploads();
    summary.filled += documentsAttached;
    highlightResults(summary.results);

    // Report back to service worker
    void chrome.runtime.sendMessage({
      type: 'FILL_COMPLETE',
      payload: {
        filled: summary.filled,
        review: summary.review,
        skipped: summary.skipped,
        url: window.location.href,
        ts: Date.now(),
      },
    });

    showFillToast(summary.filled, summary.review, summary.skipped);
  } catch (err) {
    console.error('[wayfill]', err);
    showToast('Fill error — check console', 'error');
  } finally {
    floatingBtn?.removeAttribute('data-filling');
  }
}

async function fillResumeUploads(): Promise<number> {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))
    .filter((input) => !input.disabled && input.files?.length === 0 && isResumeUpload(input));
  if (!inputs.length) return 0;

  const response: unknown = await chrome.runtime.sendMessage({ type: 'GET_CV_DOCUMENT' });
  if (!isStoredDocumentResponse(response) || !response.ok || !response.name || !response.data) return 0;

  const binary = atob(response.data);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const mime = /\.pdf$/i.test(response.name) ? 'application/pdf'
    : /\.docx$/i.test(response.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword';
  const file = new File([bytes], response.name, { type: mime });
  let count = 0;
  for (const input of inputs) {
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.setAttribute('data-wayfill-status', 'filled');
      input.style.outline = '2px solid rgba(76,175,130,0.6)';
      input.style.outlineOffset = '2px';
      setTimeout(() => { input.style.outline = ''; input.style.outlineOffset = ''; }, 3000);
      if (input.files?.[0]?.name === response.name) count++;
    } catch (err) {
      console.warn('[wayfill] resume upload fill error', input, err);
    }
  }
  return count;
}

function isResumeUpload(input: HTMLInputElement): boolean {
  const label = [input.getAttribute('aria-label'), input.getAttribute('name'), input.id,
    input.getAttribute('accept'), input.closest('label')?.textContent]
    .filter(Boolean).join(' ').toLowerCase();
  return /resume|curriculum vitae|\bcv\b/.test(label);
}

function isStoredDocumentResponse(value: unknown): value is { ok: boolean; name?: string; data?: string } {
  return typeof value === 'object' && value !== null
    && typeof Reflect.get(value, 'ok') === 'boolean'
    && (Reflect.get(value, 'name') === undefined || typeof Reflect.get(value, 'name') === 'string')
    && (Reflect.get(value, 'data') === undefined || typeof Reflect.get(value, 'data') === 'string');
}

// ── AI Fill handler ────────────────────────────────────────────────────────
async function handleAIFill() {
  if (!floatingBtn) return;
  floatingBtn.setAttribute('data-filling', 'true');
  showToast('wayfill: reading page questions…', 'warn');

  try {
    const settings = await loadSettings();
    const host = window.location.hostname;
    if (settings.siteEnabled[host] === false) {
      showToast('Wayfill is disabled for this site.', 'warn');
      return;
    }

    // 1. Run local fill first
    const profile = await getActiveProfile();
    const summary = fillForm(profile, document);
    highlightResults(summary.results);

    // 2. Collect every visible labeled field not yet filled
    const questions = collectAIQuestions();

    if (questions.length === 0) {
      showFillToast(summary.filled, summary.review, summary.skipped);
      return;
    }

    if (!settings.aiPreviewSites[host]) {
      const preview: unknown = await chrome.runtime.sendMessage({ type: 'AI_FILL_PREVIEW' });
      if (!isPreviewResponse(preview)) {
        showToast('wayfill AI error: could not prepare privacy preview', 'error');
        return;
      }
      const previewResult = preview;
      if (!previewResult.ok || !previewResult.profile) {
        showToast(`wayfill AI error: ${previewResult.error ?? 'could not prepare privacy preview'}`, 'error');
        return;
      }
      const approved = window.confirm(
        `The following profile information and questions will be sent to OpenRouter to generate answers. Review the information before continuing.\n\nPROFILE:\n${previewResult.profile}\n\nQUESTIONS:\n${questions.map((q, i) => `${i + 1}. ${formatAIQuestion(q)}`).join('\n')}`,
      );
      if (!approved) return;
      await patchSettings({
        aiPreviewSites: { ...settings.aiPreviewSites, [host]: true },
      });
    }

    showToast(`wayfill: asking AI about ${questions.length} question(s)…`, 'warn');

    // 3. Send all questions to service worker in one call
    const rawResult: unknown = await chrome.runtime.sendMessage({
      type: 'AI_FILL',
      payload: { questions: questions.map(formatAIQuestion) },
    });
    if (!isAIFillResponse(rawResult)) {
      showToast('wayfill AI error: invalid response from service worker', 'error');
      return;
    }
    const result = rawResult;

    if (!result.ok) {
      showToast(`wayfill AI error: ${result.error ?? 'unknown'}`, 'error');
      return;
    }

    // 4. Write answers back into the fields
    let aiCount = 0;
    for (const [index, question] of questions.entries()) {
      const answer = result.answers?.[index];
      if (!answer) continue;
      if (question.radios) {
        const normalizedAnswer = answer.trim().toLowerCase();
        const selected = question.radios.find((radio) =>
          normalizeChoice(radio.value) === normalizeChoice(normalizedAnswer)
          || normalizeChoice(getRadioLabel(radio)) === normalizeChoice(normalizedAnswer),
        );
        if (!selected) continue;
        selected.click();
        selected.checked = true;
        selected.dispatchEvent(new Event('input', { bubbles: true }));
        selected.dispatchEvent(new Event('change', { bubbles: true }));
        selected.setAttribute('data-wayfill-status', 'review');
        highlightAIField(selected);
        aiCount++;
        continue;
      }

      const el = question.el;
      if (!el) continue;
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const descriptor: unknown = Reflect.getOwnPropertyDescriptor(proto, 'value');
      const setter: unknown = typeof descriptor === 'object' && descriptor !== null
        ? Reflect.get(descriptor, 'set')
        : undefined;
      if (typeof setter === 'function') Reflect.apply(setter, input, [answer]);
      else input.value = answer;
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      el.setAttribute('data-wayfill-status', 'review');
      highlightAIField(el);
      aiCount++;
    }

    void chrome.runtime.sendMessage({
      type: 'FILL_COMPLETE',
      payload: {
        filled: summary.filled,
        review: summary.review + aiCount,
        skipped: summary.skipped,
        url: window.location.href,
        ts: Date.now(),
      },
    });

    showFillToast(summary.filled, summary.review + aiCount, summary.skipped);
  } catch (err) {
    console.error('[wayfill]', err);
    showToast('AI fill error — check console', 'error');
  } finally {
    floatingBtn?.removeAttribute('data-filling');
  }
}

// ── Collect visible labeled fields not yet filled by local matcher ─────────
function highlightAIField(el: HTMLElement) {
  el.style.outline = '2px solid rgba(212,168,75,0.6)';
  el.style.outlineOffset = '2px';
  setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 4000);
}

function normalizeChoice(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isPreviewResponse(
  value: unknown,
): value is { ok: boolean; profile?: string; error?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const ok: unknown = Reflect.get(value, 'ok');
  const profile: unknown = Reflect.get(value, 'profile');
  const error: unknown = Reflect.get(value, 'error');
  return typeof ok === 'boolean'
    && (profile === undefined || typeof profile === 'string')
    && (error === undefined || typeof error === 'string');
}

function isAIFillResponse(
  value: unknown,
): value is { ok: boolean; answers?: string[]; error?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const ok: unknown = Reflect.get(value, 'ok');
  const answers: unknown = Reflect.get(value, 'answers');
  const error: unknown = Reflect.get(value, 'error');
  return typeof ok === 'boolean'
    && (answers === undefined
      || (Array.isArray(answers) && answers.every((answer: unknown) => typeof answer === 'string')))
    && (error === undefined || typeof error === 'string');
}

// ── Toast notification ─────────────────────────────────────────────────────
let toastEl: HTMLElement | null = null;

function showToast(msg: string, type: 'success' | 'warn' | 'error' = 'success') {
  if (toastEl) toastEl.remove();
  const el = document.createElement('div');
  el.id = 'wayfill-toast';
  const colors = { success: '#4caf82', warn: '#d4a84b', error: '#c0544a' };
  el.style.cssText = `
    position:fixed;bottom:80px;right:24px;z-index:2147483647;
    padding:10px 16px;border-radius:8px;font-size:13px;font-weight:300;
    font-family:'Inter',system-ui,sans-serif;color:#efefef;
    background:#161616;border:1px solid ${colors[type]};
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
    opacity:0;transform:translateY(6px);transition:opacity 0.2s,transform 0.2s;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  toastEl = el;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

function showFillToast(filled: number, review: number, skipped: number) {
  const parts: string[] = [];
  if (filled)  parts.push(`${filled} filled`);
  if (review)  parts.push(`${review} needs review`);
  if (skipped) parts.push(`${skipped} skipped`);
  const msg = parts.length ? parts.join(' · ') : 'No fields matched';
  showToast(`wayfill: ${msg}`, filled > 0 ? 'success' : 'warn');
}

// ── Message listener ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const message = msg as { type: string };
  if (message.type === 'FILL_START') {
    void handleFill().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'AI_FILL_START') {
    void handleAIFill().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'HIDE_FAB') {
    floatingBtn?.classList.add('hidden');
    return false;
  }
  if (message.type === 'SHOW_FAB') {
    floatingBtn?.classList.remove('hidden');
    return false;
  }
});

// ── SPA mutation observer ─────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function onDOMChange() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (isJobPage() && !document.getElementById('wayfill-fab')) {
      injectFloatingButton();
    }
  }, 800);
}

const observer = new MutationObserver(onDOMChange);
observer.observe(document.body, { childList: true, subtree: true });

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  // Check site-enabled setting
  void (async () => {
    const settings = await loadSettings();
    const host = window.location.hostname;
    if (settings.siteEnabled[host] === false) return;
    injectFloatingButton();
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Keyboard shortcut handled via service worker → FILL_START message
