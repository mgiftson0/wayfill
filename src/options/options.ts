import './options.css';

type Tab =
  | 'profile'
  | 'education'
  | 'experience'
  | 'documents'
  | 'qa'
  | 'ai'
  | 'privacy'
  | 'import-export';

const TABS: { id: Tab; label: string; icon: string; group: string }[] = [
  { id: 'profile',        label: 'Personal Info',   icon: iconUser(),     group: 'Profile' },
  { id: 'education',      label: 'Education',        icon: iconBook(),     group: 'Profile' },
  { id: 'experience',     label: 'Experience',       icon: iconBriefcase(),group: 'Profile' },
  { id: 'documents',      label: 'Documents',        icon: iconFile(),     group: 'Resources' },
  { id: 'qa',             label: 'Q&A Bank',         icon: iconChat(),     group: 'Resources' },
  { id: 'ai',             label: 'AI Settings',      icon: iconSpark(),    group: 'Settings' },
  { id: 'privacy',        label: 'Privacy',          icon: iconShield(),   group: 'Settings' },
  { id: 'import-export',  label: 'Import / Export',  icon: iconArrows(),   group: 'Settings' },
];

function iconUser()      { return svgIcon('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z'); }
function iconBook()      { return svgIcon('M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2 2 0 012-2h12a2 2 0 012 2v12M4 19.5V20'); }
function iconBriefcase() { return svgIcon('M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2zM1 10h22M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2'); }
function iconFile()      { return svgIcon('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8'); }
function iconChat()      { return svgIcon('M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'); }
function iconSpark()     { return svgIcon('M13 2L3 14h9l-1 8 10-12h-9l1-8z'); }
function iconShield()    { return svgIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'); }
function iconArrows()    { return svgIcon('M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4'); }

function svgIcon(d: string) {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

function buildSidebar(activeTab: Tab): string {
  const groups = [...new Set(TABS.map((t) => t.group))];
  const navItems = groups
    .map((group) => {
      const items = TABS.filter((t) => t.group === group);
      return `
        <div class="nav-section-label">${group}</div>
        ${items
          .map(
            (t) => `
          <button class="nav-item ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
            ${t.icon}
            ${t.label}
          </button>`
          )
          .join('')}
      `;
    })
    .join('');

  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="wordmark">wayfill</span>
      </div>
      <nav class="nav">${navItems}</nav>
      <div class="sidebar-footer">v0.1.0 — Phase 1</div>
    </aside>
  `;
}

function renderTabContent(tab: Tab): string {
  switch (tab) {
    case 'profile':
      return `
        <h1 class="page-title">Personal Information</h1>
        <p class="page-subtitle">Your details autofilled into job applications. Never shared externally.</p>

        <div class="section-card">
          <div class="section-card-title">Basic info</div>
          <div class="field-grid">
            <div class="field"><label class="field-label">First name</label><input id="first-name" type="text" placeholder="Jane" /></div>
            <div class="field"><label class="field-label">Last name</label><input id="last-name" type="text" placeholder="Smith" /></div>
            <div class="field"><label class="field-label">Email</label><input id="email" type="email" placeholder="jane@example.com" /></div>
            <div class="field"><label class="field-label">Phone</label><input id="phone" type="tel" placeholder="(555) 000-0000" /></div>
            <div class="field"><label class="field-label">City</label><input id="city" type="text" placeholder="San Francisco" /></div>
            <div class="field"><label class="field-label">State</label><input id="state" type="text" placeholder="CA" /></div>
            <div class="field"><label class="field-label">ZIP code</label><input id="zip" type="text" placeholder="94105" /></div>
            <div class="field"><label class="field-label">Country</label><input id="country" type="text" placeholder="United States" /></div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Links</div>
          <div class="field-grid">
            <div class="field"><label class="field-label">LinkedIn</label><input id="linkedin" type="url" placeholder="https://linkedin.com/in/…" /></div>
            <div class="field"><label class="field-label">GitHub</label><input id="github" type="url" placeholder="https://github.com/…" /></div>
            <div class="field"><label class="field-label">Portfolio</label><input id="portfolio" type="url" placeholder="https://…" /></div>
            <div class="field"><label class="field-label">Other link</label><input id="other-link" type="url" placeholder="https://…" /></div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Work authorization</div>
          <div class="field-grid">
            <div class="field"><label class="field-label">Authorized to work in the U.S.?</label><select id="authorized"><option value="">— select —</option><option>Yes</option><option>No</option></select></div>
            <div class="field"><label class="field-label">Require sponsorship now?</label><select id="sponsorship-now"><option value="">— select —</option><option>Yes</option><option>No</option></select></div>
            <div class="field"><label class="field-label">Require sponsorship in future?</label><select id="sponsorship-future"><option value="">— select —</option><option>Yes</option><option>No</option></select></div>
            <div class="field"><label class="field-label">Visa type (if applicable)</label><input id="visa-type" type="text" placeholder="H-1B, OPT, etc." /></div>
            <div class="field"><label class="field-label">Age 18+?</label><select id="over-18"><option value="">— select —</option><option>Yes</option><option>No</option></select></div>
            <div class="field"><label class="field-label">Security clearance</label><select id="clearance"><option value="">— select —</option><option>None</option><option>Secret</option><option>Top Secret</option><option>TS/SCI</option></select></div>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">EEO self-identification <span style="font-size:10px;color:var(--muted);font-weight:300;">(optional — defaults to Decline)</span></div>
          <div class="field-grid">
            <div class="field"><label class="field-label">Gender</label><select id="eeo-gender"><option>Decline to self-identify</option><option>Male</option><option>Female</option><option>Non-binary</option></select></div>
            <div class="field"><label class="field-label">Race/Ethnicity</label><select id="eeo-race"><option>Decline to self-identify</option><option>Hispanic/Latino</option><option>White</option><option>Black/African American</option><option>Asian</option><option>Native American</option><option>Pacific Islander</option><option>Two or more races</option></select></div>
            <div class="field"><label class="field-label">Veteran status</label><select id="eeo-veteran"><option>Decline to self-identify</option><option>I identify as one or more of the classifications of protected veteran</option><option>I am not a protected veteran</option></select></div>
            <div class="field"><label class="field-label">Disability status</label><select id="eeo-disability"><option>Decline to self-identify</option><option>Yes, I have a disability</option><option>No, I don't have a disability</option></select></div>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="save-profile">Save profile</button>
        </div>
      `;

    case 'education':
      return `
        <h1 class="page-title">Education</h1>
        <p class="page-subtitle">Add one or more education entries. The first is used as the default.</p>
        <div class="coming-soon">
          ${svgIcon('M12 14l9-5-9-5-9 5 9 5z')}
          <p>Education section — coming in Phase 2</p>
        </div>
      `;

    case 'experience':
      return `
        <h1 class="page-title">Work Experience</h1>
        <p class="page-subtitle">Positions autofilled into repeating work history sections.</p>
        <div class="coming-soon">
          ${svgIcon('M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2z')}
          <p>Experience section — coming in Phase 2</p>
        </div>
      `;

    case 'documents':
      return `
        <h1 class="page-title">Documents</h1>
        <p class="page-subtitle">Store resumes, cover letters, transcripts, and certifications (PDF/DOCX, up to 10 MB).</p>
        <div class="coming-soon">
          ${iconFile()}
          <p>Document store — coming in Phase 6</p>
        </div>
      `;

    case 'qa':
      return `
        <h1 class="page-title">Q&A Bank</h1>
        <p class="page-subtitle">Custom answers for open-ended questions, with variants and fuzzy matching.</p>
        <div class="coming-soon">
          ${iconChat()}
          <p>Q&A bank — coming in Phase 2</p>
        </div>
      `;

    case 'ai':
      return `
        <h1 class="page-title">AI Settings</h1>
        <p class="page-subtitle">Wayfill uses your own Anthropic API key. It never sends your data to any server except Anthropic's, and only when you click "Analyze this job".</p>
        <div class="section-card">
          <div class="section-card-title">Anthropic API key</div>
          <div class="field-grid cols-1">
            <div class="field">
              <label class="field-label">API key</label>
              <input id="anthropic-key" type="password" placeholder="sk-ant-…" />
            </div>
            <div class="field">
              <label class="field-label">Model</label>
              <input id="ai-model" type="text" value="claude-sonnet-4-6" />
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-ai">Save AI settings</button>
          </div>
        </div>
        <div class="coming-soon" style="padding:20px 0 0">
          ${iconSpark()}
          <p>Full AI assistant — coming in Phase 8</p>
        </div>
      `;

    case 'privacy':
      return `
        <h1 class="page-title">Privacy</h1>
        <p class="page-subtitle">Wayfill stores all data locally in your browser. No analytics, no remote code.</p>
        <div class="section-card">
          <div class="section-card-title">Passphrase encryption</div>
          <div class="field-grid cols-1">
            <div class="field">
              <label class="field-label">Passphrase (AES-GCM encryption for sensitive fields)</label>
              <input id="passphrase" type="password" placeholder="Leave blank to disable encryption" />
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-passphrase">Set passphrase</button>
            <button class="btn btn-danger" id="clear-passphrase">Clear passphrase</button>
          </div>
        </div>
        <div class="coming-soon" style="padding:20px 0 0">
          ${iconShield()}
          <p>Full privacy controls — coming in Phase 2</p>
        </div>
      `;

    case 'import-export':
      return `
        <h1 class="page-title">Import / Export</h1>
        <p class="page-subtitle">Back up your profile as JSON or restore from a previous export.</p>
        <div class="coming-soon">
          ${iconArrows()}
          <p>Import/export — coming in Phase 2</p>
        </div>
      `;
  }
}

function render(activeTab: Tab = 'profile') {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    ${buildSidebar(activeTab)}
    <main class="main" id="main-content">
      ${renderTabContent(activeTab)}
    </main>
  `;

  // Nav item clicks
  app.querySelectorAll<HTMLButtonElement>('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset['tab'] as Tab;
      render(tab);
    });
  });
}

render();
