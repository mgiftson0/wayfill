import './popup.css';
import { loadSettings, patchSettings, getActiveProfile } from '../storage/storage';

const JOB_TYPES = [
  'Internship', 'Co-op', 'Full-time', 'Part-time',
  'Contract/Temporary', 'New Grad/Entry Level', 'Apprenticeship', 'Seasonal',
] as const;

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function renderPopup() {
  const app = document.getElementById('app')!;

  const [settings, profile] = await Promise.all([loadSettings(), getActiveProfile()]);
  const activeJobType = settings.activeJobType;
  const siteEnabled   = settings.siteEnabled;
  const lastSummary   = settings.lastSummary;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentHost = tab?.url ? new URL(tab.url).hostname : '';
  const isEnabled   = siteEnabled[currentHost] !== false;
  const profileName = profile.personal.firstName
    ? `${profile.personal.firstName} ${profile.personal.lastName}`.trim()
    : profile.name;

  app.innerHTML = `
    <div class="popup-header">
      <div class="logo-row">
        <svg class="logo-icon" viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="wordmark">wayfill</span>
      </div>
      <button id="open-options" class="btn-icon" title="Settings" aria-label="Open settings">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <circle cx="10" cy="10" r="3"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.22 3.22l1.42 1.42M15.36 15.36l1.42 1.42M3.22 16.78l1.42-1.42M15.36 4.64l1.42-1.42"/>
        </svg>
      </button>
    </div>

    <div class="site-row">
      <span class="site-host" title="${currentHost}">${currentHost || 'Unknown site'}</span>
      <label class="toggle" title="Enable/disable on this site">
        <input type="checkbox" id="site-toggle" ${isEnabled ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>
    </div>

    <div class="profile-chip">
      <span class="profile-avatar">${profileName.charAt(0).toUpperCase() || '?'}</span>
      <span class="profile-name">${profileName || 'No profile'}</span>
    </div>

    <div class="job-type-row">
      <label class="field-label-sm" for="job-type-select">Job type</label>
      <select id="job-type-select" class="select-sm">
        ${JOB_TYPES.map((t) => `<option value="${t}" ${t === activeJobType ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>

    <div class="btn-grid">
      <button class="btn btn-primary" id="btn-fill" ${!isEnabled ? 'disabled' : ''}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <path d="M11 2l3 3L6 13l-4 1 1-4L11 2z"/>
        </svg>
        Autofill
      </button>
      <button class="btn btn-ghost" id="btn-ai-fill" ${!isEnabled ? 'disabled' : ''}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
          <path d="M13 2l-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3zM5 8l-.7 2L2 11l2.3.7L5 14l.7-2.3L8 11l-2.3-.7L5 8z"/>
        </svg>
        AI Fill
      </button>
    </div>

    ${lastSummary ? `
    <div class="summary-row">
      <span class="summary-pill pill-green">${lastSummary.filled} filled</span>
      <span class="summary-pill pill-yellow">${lastSummary.review} review</span>
      <span class="summary-pill pill-muted">${lastSummary.skipped} skipped</span>
    </div>` : ''}

    <div class="popup-footer">
      <a href="#" id="open-options-footer" class="footer-link">Settings</a>
      <span class="footer-sep">·</span>
      <span class="footer-version">v0.1.0</span>
    </div>
  `;

  // ── Handlers ───────────────────────────────────────────────────────────
  document.getElementById('job-type-select')!.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    void patchSettings({ activeJobType: val as typeof JOB_TYPES[number] });
  });

  document.getElementById('site-toggle')!.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    const map = { ...siteEnabled, [currentHost]: checked };
    void patchSettings({ siteEnabled: map });
    document.getElementById('btn-fill')!.toggleAttribute('disabled', !checked);
    document.getElementById('btn-ai-fill')!.toggleAttribute('disabled', !checked);
  });

  document.getElementById('btn-fill')!.addEventListener('click', () => {
    void (async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;
      await chrome.tabs.sendMessage(tabId, { type: 'FILL_START' });
      window.close();
    })();
  });

  document.getElementById('btn-ai-fill')!.addEventListener('click', () => {
    void (async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;
      await chrome.tabs.sendMessage(tabId, { type: 'AI_FILL_START' });
      window.close();
    })();
  });

  const openOpts = () => { void chrome.runtime.openOptionsPage(); };
  document.getElementById('open-options')!.addEventListener('click', openOpts);
  document.getElementById('open-options-footer')!.addEventListener('click', (e) => {
    e.preventDefault();
    openOpts();
  });
}

void renderPopup();
