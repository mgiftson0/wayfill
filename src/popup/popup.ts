import './popup.css';

const JOB_TYPES = [
  'Internship',
  'Co-op',
  'Full-time',
  'Part-time',
  'Contract/Temporary',
  'New Grad/Entry Level',
  'Apprenticeship',
  'Seasonal',
] as const;

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function renderPopup() {
  const app = document.getElementById('app')!;

  // Load persisted state
  const storage = await chrome.storage.local.get(['activeJobType', 'siteEnabled', 'lastSummary']);
  const activeJobType = (storage['activeJobType'] as string) ?? 'Full-time';
  const siteEnabled = (storage['siteEnabled'] as Record<string, boolean>) ?? {};

  // Get current site
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentHost = tab?.url ? new URL(tab.url).hostname : '';
  const isEnabled = siteEnabled[currentHost] !== false; // default on

  const lastSummary = storage['lastSummary'] as {
    filled: number;
    review: number;
    skipped: number;
  } | null;

  app.innerHTML = `
    <header class="popup-header">
      <div class="logo">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="13" cy="11" r="2.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M15 13.5l1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="wordmark">wayfill</span>
      <div class="header-spacer"></div>
      <button class="settings-btn" id="open-options" title="Settings" aria-label="Open settings">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>
    </header>

    <div class="popup-body">
      <div>
        <div class="field-label">Job type</div>
        <div class="select-wrapper">
          <select id="job-type-select" aria-label="Select job type">
            ${JOB_TYPES.map(
              (t) => `<option value="${t}" ${t === activeJobType ? 'selected' : ''}>${t}</option>`
            ).join('')}
          </select>
          <svg class="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" id="btn-fill" ${!isEnabled ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Fill application
        </button>
        <button class="btn btn-secondary" id="btn-analyze" ${!isEnabled ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Analyze this job
        </button>
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Active on this site</span>
        <label class="toggle" aria-label="Toggle Wayfill on this site">
          <input type="checkbox" id="site-toggle" ${isEnabled ? 'checked' : ''} />
          <span class="toggle-track"></span>
          <span class="toggle-thumb"></span>
        </label>
      </div>

      ${
        lastSummary
          ? `<div class="summary">
          Last fill: 
          <span class="pill pill-green">✓ ${lastSummary.filled} filled</span>
          <span class="pill pill-yellow">⚠ ${lastSummary.review} review</span>
          <span class="pill pill-red">✕ ${lastSummary.skipped} skipped</span>
        </div>`
          : ''
      }
    </div>

    <footer class="popup-footer">Alt+Shift+F to fill · <a href="#" id="open-options-footer" style="color:inherit">settings</a></footer>
  `;

  // ── Event listeners ────────────────────────────────────────────────────
  document.getElementById('job-type-select')!.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    void chrome.storage.local.set({ activeJobType: val });
  });

  document.getElementById('site-toggle')!.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    const map = siteEnabled;
    map[currentHost] = checked;
    void chrome.storage.local.set({ siteEnabled: map });
    // Re-enable/disable action buttons
    document.getElementById('btn-fill')!.toggleAttribute('disabled', !checked);
    document.getElementById('btn-analyze')!.toggleAttribute('disabled', !checked);
  });

  document.getElementById('btn-fill')!.addEventListener('click', () => {
    void (async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;
      await chrome.tabs.sendMessage(tabId, { type: 'FILL_START' });
      window.close();
    })();
  });

  document.getElementById('btn-analyze')!.addEventListener('click', () => {
    void (async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;
      await chrome.tabs.sendMessage(tabId, { type: 'ANALYZE_JOB' });
      window.close();
    })();
  });

  const openOptions = () => { void chrome.runtime.openOptionsPage(); };
  document.getElementById('open-options')!.addEventListener('click', openOptions);
  document.getElementById('open-options-footer')!.addEventListener('click', (e) => {
    e.preventDefault();
    openOptions();
  });
}

void renderPopup();
