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
import { getActiveProfile } from '../storage/storage';
import { loadSettings } from '../storage/storage';
import { collectFillableFields } from './matcher';

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
    return true; // async response
  }
  if (message.type === 'ANALYZE_JOB') {
    const jobText = extractJobText();
    sendResponse({ jobText });
    return false;
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

// ── Job text extractor for AI analysis ────────────────────────────────────
function extractJobText(): string {
  // Heuristic: find the largest text block not in a form
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    'article, [class*="job"], [class*="description"], [id*="description"], main, .posting-description, .job-description',
  ));

  if (candidates.length) {
    // Pick the one with most text
    const best = candidates.reduce((a, b) =>
      (a.textContent?.length ?? 0) > (b.textContent?.length ?? 0) ? a : b,
    );
    return best.textContent?.trim().slice(0, 6000) ?? '';
  }

  return document.body.textContent?.trim().slice(0, 6000) ?? '';
}

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
