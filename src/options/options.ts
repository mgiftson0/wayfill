import './options.css';
import {
  loadSettings,
  saveProfile,
  getActiveProfile,
  exportData,
  importData,
  clearAllData,
  patchSettings,
} from '../storage/storage';
import { createBlankProfile, type Profile } from '../storage/profile-schema';
import { AppSettingsSchema } from '../storage/settings-schema';
import type { AppSettings } from '../storage/settings-schema';

type Tab =
  | 'profile'
  | 'education'
  | 'experience'
  | 'skills'
  | 'documents'
  | 'qa'
  | 'privacy'
  | 'import-export';

const TABS: { id: Tab; label: string; icon: string; group: string }[] = [
  { id: 'profile',       label: 'Personal Info',  icon: iconUser(),      group: 'Profile' },
  { id: 'education',     label: 'Education',       icon: iconBook(),      group: 'Profile' },
  { id: 'experience',    label: 'Experience',      icon: iconBriefcase(), group: 'Profile' },
  { id: 'skills',        label: 'Skills & More',   icon: iconStar(),      group: 'Profile' },
  { id: 'documents',     label: 'Documents',       icon: iconFile(),      group: 'Resources' },
  { id: 'qa',            label: 'Q&A Bank',        icon: iconChat(),      group: 'Resources' },
  { id: 'privacy',       label: 'Privacy',         icon: iconShield(),    group: 'Settings' },
  { id: 'import-export', label: 'Import / Export', icon: iconArrows(),    group: 'Settings' },
];

// SVG helpers
function svg(d: string | string[], extra = '') {
  const paths = Array.isArray(d) ? d : [d];
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths.map(p => `<path d="${p}"/>`).join('')}</svg>`;
}
function iconUser()      { return svg('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z'); }
function iconBook()      { return svg('M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2 2 0 012-2h12a2 2 0 012 2v12M4 19.5V20'); }
function iconBriefcase() { return svg(['M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2z', 'M1 10h22', 'M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2']); }
function iconStar()      { return svg('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'); }
function iconFile()      { return svg(['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']); }
function iconChat()      { return svg('M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'); }
function iconShield()    { return svg('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'); }
function iconArrows()    { return svg(['M7 16V4m0 0L3 8m4-4l4 4', 'M17 8v12m0 0l4-4m-4 4l-4-4']); }
function iconPlus()      { return svg(['M12 5v14', 'M5 12h14']); }
function iconTrash()     { return svg(['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2']); }
// iconCheck reserved for Phase 7
function iconSave()      { return svg(['M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8']); }

// ── State ──────────────────────────────────────────────────────────────────
let activeTab: Tab = 'profile';
let activeProfile: Profile;
let settings: AppSettings;

// ── Render helpers ─────────────────────────────────────────────────────────
function field(id: string, label: string, type: 'text' | 'email' | 'tel' | 'url' | 'password' | 'date' | 'number', value = '', placeholder = '', extra = '') {
  return `<div class="field">
    <label class="field-label" for="${id}">${label}</label>
    <input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${extra} />
  </div>`;
}

function selectField(id: string, label: string, options: string[], value = '') {
  return `<div class="field">
    <label class="field-label" for="${id}">${label}</label>
    <select id="${id}">
      <option value="">— select —</option>
      ${options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
    </select>
  </div>`;
}

function textareaField(id: string, label: string, value = '', placeholder = '') {
  return `<div class="field">
    <label class="field-label" for="${id}">${label}</label>
    <textarea id="${id}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
  </div>`;
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toast(msg: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('toast-visible'), 10);
  setTimeout(() => { el.classList.remove('toast-visible'); setTimeout(() => el.remove(), 300); }, 2500);
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function buildSidebar(): string {
  const groups = [...new Set(TABS.map(t => t.group))];
  return `<aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
      <span class="wordmark">wayfill</span>
    </div>
    <nav class="nav">
      ${groups.map(group => `
        <div class="nav-section-label">${group}</div>
        ${TABS.filter(t => t.group === group).map(t => `
          <button class="nav-item ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" aria-current="${t.id === activeTab ? 'page' : 'false'}">
            ${t.icon} ${t.label}
          </button>`).join('')}
      `).join('')}
    </nav>
    <div class="sidebar-footer">Wayfill v0.1.0</div>
  </aside>`;
}

// ── Tab: Personal Info ─────────────────────────────────────────────────────
function renderProfile(): string {
  const p = activeProfile.personal;
  const w = activeProfile.workAuth;
  const e = activeProfile.eeo;
  const c = activeProfile.common;
  const i = activeProfile.internAvail;
  const pay = activeProfile.pay;

  return `
    <h1 class="page-title">Personal Information</h1>
    <p class="page-subtitle">Your details autofilled into applications. Never shared externally.</p>

    <div class="section-card">
      <div class="section-card-title">Basic info</div>
      <div class="field-grid">
        ${field('p-firstName','First name','text',p.firstName,'Jane')}
        ${field('p-lastName','Last name','text',p.lastName,'Smith')}
        ${field('p-email','Email','email',p.email,'jane@example.com')}
        ${field('p-phone','Phone','tel',p.phone,'(555) 000-0000')}
        ${field('p-city','City','text',p.city,'San Francisco')}
        ${field('p-state','State','text',p.state,'CA')}
        ${field('p-zip','ZIP','text',p.zip,'94105')}
        ${field('p-country','Country','text',p.country,'United States')}
        ${field('p-address1','Street address','text',p.address1??'','')}
        ${field('p-address2','Apt / Suite','text',p.address2??'','')}
        ${selectField('p-highestDegree','Highest degree / diploma obtained',[
          'High School Diploma / GED',
          'Some College',
          'Associate\'s Degree',
          'Bachelor\'s Degree',
          'Master\'s Degree',
          'MBA',
          'J.D.',
          'M.D.',
          'Ph.D.',
          'Other',
        ],p.highestDegree??'')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Online presence</div>
      <div class="field-grid">
        ${field('p-linkedin','LinkedIn','url',p.linkedin??'','https://linkedin.com/in/…')}
        ${field('p-github','GitHub','url',p.github??'','https://github.com/…')}
        ${field('p-portfolio','Portfolio','url',p.portfolio??'','https://…')}
        ${field('p-otherLink','Other link','url',p.otherLink??'','https://…')}
      </div>
      <div class="field-grid cols-1" style="margin-top:14px">
        ${textareaField('p-summary','Professional summary',p.summary??'','A brief pitch for text fields that ask for a summary…')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Work authorization</div>
      <div class="field-grid">
        ${selectField('w-authorized','Authorized to work in U.S.?',['Yes','No'],w.authorized??'')}
        ${selectField('w-sponsorshipNow','Require sponsorship or visa support now?',['Yes','No'],w.sponsorshipNow??'')}
        ${selectField('w-sponsorshipFuture','Will you require sponsorship or visa support in the future?',['Yes','No'],w.sponsorshipFuture??'')}
        ${field('w-visaType','Visa type','text',w.visaType??'','H-1B, OPT, F-1, etc.')}
        ${selectField('w-over18','Age 18 or older?',['Yes','No'],w.over18??'')}
        ${selectField('w-clearance','Security clearance',['None','Secret','Top Secret','TS/SCI'],w.clearance??'')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Internship &amp; availability</div>
      <div class="field-grid">
        ${field('i-startDate','Available from','date',i.startDate??'')}
        ${field('i-endDate','Available until','date',i.endDate??'')}
        ${field('i-hoursPerWeek','Hours per week','number',i.hoursPerWeek?.toString()??'','40')}
        ${selectField('i-relocation','Open to relocation?',['Yes','No','Maybe'],i.relocation??'')}
        ${selectField('i-workMode','Work mode',['Remote','Hybrid','On-site','Any'],i.workMode??'')}
        ${selectField('i-travel','Travel willingness',['0%','25%','50%','75%','100%'],i.travel??'')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Pay expectations</div>
      <div class="field-grid">
        ${field('pay-minimum','Minimum acceptable','text',pay.minimum??'','e.g. 80000')}
        ${field('pay-desired','Desired compensation','text',pay.desired??'','e.g. 110000')}
        ${selectField('pay-currency','Currency',['USD','CAD','GBP','EUR'],pay.currency)}
        ${selectField('pay-period','Period',['annual','hourly'],pay.period)}
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-title">Common questions</div>
      <div class="field-grid">
        ${selectField('c-previousEmployee','Have you previously worked at this company (as employee or contractor)?',['Yes','No'],c.previousEmployee??'')}
        ${selectField('c-relativesAtCompany','Relatives at company?',['Yes','No'],c.relativesAtCompany??'')}
        ${selectField('c-backgroundCheck','Consent to background check?',['Yes','No'],c.backgroundCheck??'')}
        ${selectField('c-drugTest','Consent to drug test?',['Yes','No'],c.drugTest??'')}
        ${selectField('c-nonCompete','Currently under non-compete?',['Yes','No'],c.nonCompete??'')}
        ${field('c-referralSource','How did you hear about us?','text',c.referralSource??'','LinkedIn, Indeed, etc.')}
      </div>
      <div class="field-grid cols-1" style="margin-top:14px">
        ${textareaField('c-interviewAvailability','Interview availability (M-F, 9am–5pm EST)',c.interviewAvailability??'','e.g. Monday–Friday, 10am–4pm EST; prefer afternoons')}
      </div>
    </div>

    <div class="section-card eeo-card">
      <div class="section-card-title">
        EEO self-identification
        <span class="badge-muted">optional — defaults to Decline</span>
      </div>
      <p class="field-hint">These answers are used <strong>only</strong> for EEO forms. They are never sent to the AI.</p>
      <div class="field-grid">
        ${selectField('eeo-gender','Gender',['Decline to self-identify','Male','Female','Non-binary','Prefer to self-describe'],e.gender)}
        ${selectField('eeo-race','Race / Ethnicity',['Decline to self-identify','Hispanic/Latino','White','Black/African American','Asian','Native American/Alaska Native','Pacific Islander','Two or more races'],e.race)}
        ${selectField('eeo-veteran','Veteran status',['Decline to self-identify','I identify as one or more classifications of protected veteran','I am not a protected veteran'],e.veteran)}
        ${selectField('eeo-disability','Disability status',['Decline to self-identify','Yes, I have a disability (or previously had a disability)','No, I don\'t have a disability'],e.disability)}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="save-profile-btn">${iconSave()} Save profile</button>
      <span class="save-status" id="save-status"></span>
    </div>
  `;
}

// ── Tab: Education ─────────────────────────────────────────────────────────
function renderEducation(): string {
  const entries = activeProfile.education;
  return `
    <h1 class="page-title">Education</h1>
    <p class="page-subtitle">Add all degrees. The first entry is used as the default.</p>
    <div id="education-list">
      ${entries.map((e, i) => `
        <div class="section-card entry-card" data-entry-id="${e.id}">
          <div class="entry-header">
            <span class="entry-num">Education ${i + 1}</span>
            <button class="btn btn-ghost btn-sm delete-entry" data-type="education" data-id="${e.id}" aria-label="Delete entry">${iconTrash()}</button>
          </div>
          <div class="field-grid">
            ${field(`edu-institution-${e.id}`,'Institution','text',e.institution,'MIT, Stanford, etc.')}
            ${field(`edu-degree-${e.id}`,'Degree','text',e.degree,'B.S., M.S., Ph.D.')}
            ${field(`edu-field-${e.id}`,'Field of study','text',e.field,'Computer Science')}
            ${field(`edu-gpa-${e.id}`,'GPA','text',e.gpa??'','3.8')}
            ${field(`edu-startDate-${e.id}`,'Start date','date',e.startDate??'')}
            ${field(`edu-endDate-${e.id}`,'End / Expected date','date',e.endDate??'')}
          </div>
        </div>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="add-education">${iconPlus()} Add education</button>
      <button class="btn btn-primary" id="save-education-btn">${iconSave()} Save</button>
    </div>
  `;
}

// ── Tab: Experience ────────────────────────────────────────────────────────
function renderExperience(): string {
  const entries = activeProfile.experience;
  return `
    <h1 class="page-title">Work Experience</h1>
    <p class="page-subtitle">List positions chronologically. Most recent first.</p>
    <div id="experience-list">
      ${entries.map((e, i) => `
        <div class="section-card entry-card" data-entry-id="${e.id}">
          <div class="entry-header">
            <span class="entry-num">Position ${i + 1}</span>
            <button class="btn btn-ghost btn-sm delete-entry" data-type="experience" data-id="${e.id}" aria-label="Delete entry">${iconTrash()}</button>
          </div>
          <div class="field-grid">
            ${field(`exp-company-${e.id}`,'Company','text',e.company,'Acme Corp')}
            ${field(`exp-title-${e.id}`,'Job title','text',e.title,'Software Engineer')}
            ${field(`exp-location-${e.id}`,'Location','text',e.location??'','San Francisco, CA')}
            ${field(`exp-startDate-${e.id}`,'Start date','date',e.startDate??'')}
            ${field(`exp-endDate-${e.id}`,'End date','date',e.endDate??'')}
          </div>
          <div class="field-grid cols-1" style="margin-top:10px">
            ${textareaField(`exp-desc-${e.id}`,'Description / bullets',e.description??'','• Built feature X that improved Y by Z…')}
          </div>
        </div>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="add-experience">${iconPlus()} Add position</button>
      <button class="btn btn-primary" id="save-experience-btn">${iconSave()} Save</button>
    </div>
  `;
}

// ── Tab: Skills ────────────────────────────────────────────────────────────
function renderSkills(): string {
  const certs = activeProfile.certifications;
  return `
    <h1 class="page-title">Skills, Certifications &amp; Languages</h1>
    <p class="page-subtitle">Comma-separated lists used for keyword matching and resume gap analysis.</p>
    <div class="section-card">
      <div class="section-card-title">Technical &amp; soft skills</div>
      <div class="field-grid cols-1">
        <div class="field">
          <label class="field-label" for="skills-input">Skills (comma-separated)</label>
          <textarea id="skills-input" rows="3" placeholder="TypeScript, React, Python, SQL, Communication…">${activeProfile.skills.join(', ')}</textarea>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">Certifications / Licenses</div>
      <div id="certs-list">
        ${certs.map((c, i) => `
          <div class="entry-card" data-cert-id="${c.id}">
            <div class="entry-header">
              <span class="entry-num">Certification ${i + 1}</span>
              <button class="btn btn-ghost btn-sm delete-cert" data-id="${c.id}" aria-label="Delete">${iconTrash()}</button>
            </div>
            <div class="field-grid">
              ${field(`cert-name-${c.id}`, 'Name', 'text', c.name, 'AWS Solutions Architect')}
              ${field(`cert-issuer-${c.id}`, 'Issuing organization', 'text', c.issuer ?? '', 'Amazon Web Services')}
              ${field(`cert-url-${c.id}`, 'Credential URL', 'url', c.url ?? '', 'https://…')}
              ${field(`cert-startDate-${c.id}`, 'Issue date', 'date', c.startDate ?? '')}
              ${field(`cert-endDate-${c.id}`, 'Expiry date (blank = no expiry)', 'date', c.endDate ?? '')}
            </div>
          </div>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="add-cert">${iconPlus()} Add certification</button>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">Languages</div>
      <div class="field-grid cols-1">
        <div class="field">
          <label class="field-label" for="langs-input">Languages spoken (comma-separated)</label>
          <textarea id="langs-input" rows="2" placeholder="English (native), Spanish (professional)…">${activeProfile.languages.join(', ')}</textarea>
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="save-skills-btn">${iconSave()} Save</button>
    </div>
  `;
}

// ── Tab: Q&A Bank ──────────────────────────────────────────────────────────
function renderQA(): string {
  const qa = activeProfile.qa;
  return `
    <h1 class="page-title">Q&amp;A Bank</h1>
    <p class="page-subtitle">Saved answers for open-ended questions. The AI uses these to generate tailored responses.</p>
    <div id="qa-list">
      ${qa.map((q, i) => `
        <div class="section-card entry-card" data-entry-id="${q.id}">
          <div class="entry-header">
            <span class="entry-num">Answer ${i + 1}</span>
            <button class="btn btn-ghost btn-sm delete-entry" data-type="qa" data-id="${q.id}">${iconTrash()}</button>
          </div>
          <div class="field-grid cols-1">
            ${field(`qa-question-${q.id}`,'Question / keyword','text',q.question,'Why do you want to work here?')}
            ${textareaField(`qa-answer-${q.id}`,'Your answer',q.answer,'I am drawn to this company because…')}
            ${field(`qa-keywords-${q.id}`,'Match keywords (comma-separated)','text',q.keywords.join(', '),'why, motivation, fit')}
          </div>
        </div>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" id="add-qa">${iconPlus()} Add answer</button>
      <button class="btn btn-primary" id="save-qa-btn">${iconSave()} Save</button>
    </div>
  `;
}

// ── Tab: Documents ─────────────────────────────────────────────────────────
function renderDocuments(): string {
  const stored = settings.cvFileName ?? '';
  return `
    <h1 class="page-title">Documents</h1>
    <p class="page-subtitle">Upload your CV/resume so Wayfill can attach it to file-upload fields automatically.</p>
    <div class="section-card">
      <div class="section-card-title">CV / Resume</div>
      <p class="field-hint">Accepted: PDF, DOC, DOCX ≤ 10 MB. Stored locally — never uploaded anywhere.</p>
      <div class="btn-row">
        <label class="btn btn-ghost" style="cursor:pointer">
          ${iconFile()} Choose file
          <input type="file" id="cv-file" accept=".pdf,.doc,.docx" style="display:none" />
        </label>
        ${stored ? `<button class="btn btn-danger" id="remove-cv">Remove</button>` : ''}
      </div>
      <p class="save-status" id="cv-status">${stored ? `Current file: ${esc(stored)}` : 'No file uploaded yet'}</p>
    </div>
  `;
}

// ── Tab: Privacy ───────────────────────────────────────────────────────────
function renderPrivacy(): string {
  return `
    <h1 class="page-title">Privacy &amp; Security</h1>
    <p class="page-subtitle">Profile data stays local unless you choose AI Fill. The first AI request on each site shows a preview of the profile details and questions sent to OpenRouter.</p>

    <div class="section-card">
      <div class="section-card-title">AI Fill and data</div>
      <p class="field-hint">Profile data is stored locally. AI Fill sends the profile preview and questions to OpenRouter only after you approve the first request on each site. EEO and sensitive financial/credential questions are excluded.</p>
    </div>

    <div class="section-card" style="margin-top:16px">
      <div class="section-card-title">Data management</div>
      <div class="btn-row">
        <button class="btn btn-danger" id="clear-all-btn">Delete all data</button>
      </div>
    </div>
  `;
}

// ── Tab: Import / Export ───────────────────────────────────────────────────
function renderImportExport(): string {
  return `
    <h1 class="page-title">Import / Export</h1>
    <p class="page-subtitle">Back up or restore your entire Wayfill profile and settings as JSON.</p>

    <div class="section-card">
      <div class="section-card-title">Export</div>
      <p class="field-hint">Downloads a wayfill-export.json file with all profiles and settings.</p>
      <div class="btn-row">
        <button class="btn btn-primary" id="export-btn">${iconArrows()} Export profile</button>
      </div>
    </div>

    <div class="section-card" style="margin-top:16px">
      <div class="section-card-title">Import</div>
      <p class="field-hint">Select a previously exported wayfill-export.json. This merges profiles — it does not delete existing ones.</p>
      <div class="btn-row">
        <label class="btn btn-ghost" style="cursor:pointer">
          ${iconArrows()} Choose file
          <input type="file" id="import-file" accept=".json" style="display:none" />
        </label>
      </div>
      <p class="save-status" id="import-status"></p>
    </div>
  `;
}

// ── Tab router ─────────────────────────────────────────────────────────────
function renderTabContent(): string {
  switch (activeTab) {
    case 'profile':       return renderProfile();
    case 'education':     return renderEducation();
    case 'experience':    return renderExperience();
    case 'skills':        return renderSkills();
    case 'documents':     return renderDocuments();
    case 'qa':            return renderQA();
    case 'privacy':       return renderPrivacy();
    case 'import-export': return renderImportExport();
  }
}

// ── Full render ────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    ${buildSidebar()}
    <main class="main" id="main-content">${renderTabContent()}</main>
  `;
  attachHandlers();
}

// ── Value readers ──────────────────────────────────────────────────────────
function val(id: string) {
  return (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value ?? '';
}

// ── Event handlers ─────────────────────────────────────────────────────────
function attachHandlers() {
  // Nav
  document.querySelectorAll<HTMLButtonElement>('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset['tab'] as Tab;
      render();
    });
  });

  switch (activeTab) {
    case 'profile':       attachProfileHandlers(); break;
    case 'education':     attachEducationHandlers(); break;
    case 'experience':    attachExperienceHandlers(); break;
    case 'skills':        attachSkillsHandlers(); break;
    case 'documents':     attachDocumentsHandlers(); break;
    case 'qa':            attachQAHandlers(); break;
    case 'privacy':       attachPrivacyHandlers(); break;
    case 'import-export': attachImportExportHandlers(); break;
    default: break;
  }
}

// ── Profile handlers ───────────────────────────────────────────────────────
function attachProfileHandlers() {
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    void (async () => {
      activeProfile.personal = {
        firstName: val('p-firstName'), lastName: val('p-lastName'),
        email: val('p-email'), phone: val('p-phone'),
        city: val('p-city'), state: val('p-state'), zip: val('p-zip'),
        country: val('p-country'), address1: val('p-address1') || undefined,
        address2: val('p-address2') || undefined,
        linkedin: val('p-linkedin') || undefined, github: val('p-github') || undefined,
        portfolio: val('p-portfolio') || undefined, otherLink: val('p-otherLink') || undefined,
        summary: val('p-summary') || undefined,
        highestDegree: val('p-highestDegree') || undefined,
      };
      activeProfile.workAuth = {
        authorized: val('w-authorized') || undefined, sponsorshipNow: val('w-sponsorshipNow') || undefined,
        sponsorshipFuture: val('w-sponsorshipFuture') || undefined, visaType: val('w-visaType') || undefined,
        over18: val('w-over18') || undefined, clearance: val('w-clearance') || undefined,
      };
      activeProfile.internAvail = {
        startDate: val('i-startDate') || undefined, endDate: val('i-endDate') || undefined,
        hoursPerWeek: val('i-hoursPerWeek') ? Number(val('i-hoursPerWeek')) : undefined,
        relocation: val('i-relocation') || undefined, workMode: val('i-workMode') || undefined,
        travel: val('i-travel') || undefined,
      };
      activeProfile.pay = {
        minimum: val('pay-minimum') || undefined, desired: val('pay-desired') || undefined,
        currency: val('pay-currency') || 'USD', period: val('pay-period') || 'annual',
      };
      activeProfile.common = {
        previousEmployee: val('c-previousEmployee') || undefined, relativesAtCompany: val('c-relativesAtCompany') || undefined,
        backgroundCheck: val('c-backgroundCheck') || undefined, drugTest: val('c-drugTest') || undefined,
        nonCompete: val('c-nonCompete') || undefined, referralSource: val('c-referralSource') || undefined,
        interviewAvailability: val('c-interviewAvailability') || undefined,
      };
      activeProfile.eeo = {
        gender: val('eeo-gender') || 'Decline to self-identify',
        race: val('eeo-race') || 'Decline to self-identify',
        veteran: val('eeo-veteran') || 'Decline to self-identify',
        disability: val('eeo-disability') || 'Decline to self-identify',
      };
      await saveProfile(activeProfile);
      toast('Profile saved');
    })();
  });
}

// ── Education handlers ─────────────────────────────────────────────────────
function attachEducationHandlers() {
  document.getElementById('add-education')?.addEventListener('click', () => {
    activeProfile.education.push({ id: crypto.randomUUID(), institution: '', degree: '', field: '' });
    render();
  });

  document.getElementById('save-education-btn')?.addEventListener('click', () => {
    void (async () => {
      activeProfile.education = activeProfile.education.map(e => ({
        ...e,
        institution: val(`edu-institution-${e.id}`),
        degree: val(`edu-degree-${e.id}`),
        field: val(`edu-field-${e.id}`),
        gpa: val(`edu-gpa-${e.id}`) || undefined,
        startDate: val(`edu-startDate-${e.id}`) || undefined,
        endDate: val(`edu-endDate-${e.id}`) || undefined,
      }));
      await saveProfile(activeProfile);
      toast('Education saved');
    })();
  });

  attachDeleteHandlers('education');
}

// ── Experience handlers ────────────────────────────────────────────────────
function attachExperienceHandlers() {
  document.getElementById('add-experience')?.addEventListener('click', () => {
    activeProfile.experience.push({ id: crypto.randomUUID(), company: '', title: '' });
    render();
  });

  document.getElementById('save-experience-btn')?.addEventListener('click', () => {
    void (async () => {
      activeProfile.experience = activeProfile.experience.map(e => ({
        ...e,
        company: val(`exp-company-${e.id}`),
        title: val(`exp-title-${e.id}`),
        location: val(`exp-location-${e.id}`) || undefined,
        startDate: val(`exp-startDate-${e.id}`) || undefined,
        endDate: val(`exp-endDate-${e.id}`) || undefined,
        description: val(`exp-desc-${e.id}`) || undefined,
      }));
      await saveProfile(activeProfile);
      toast('Experience saved');
    })();
  });

  attachDeleteHandlers('experience');
}

// ── Skills handlers ────────────────────────────────────────────────────────
function attachSkillsHandlers() {
  document.getElementById('add-cert')?.addEventListener('click', () => {
    activeProfile.certifications.push({ id: crypto.randomUUID(), name: '' });
    render();
  });

  document.querySelectorAll<HTMLButtonElement>('.delete-cert').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset['id']!;
      activeProfile.certifications = activeProfile.certifications.filter(c => c.id !== id);
      render();
    });
  });

  document.getElementById('save-skills-btn')?.addEventListener('click', () => {
    void (async () => {
      const splitCSV = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
      activeProfile.skills = splitCSV(val('skills-input'));
      activeProfile.certifications = activeProfile.certifications.map(c => ({
        ...c,
        name:      val(`cert-name-${c.id}`),
        issuer:    val(`cert-issuer-${c.id}`) || undefined,
        url:       val(`cert-url-${c.id}`) || undefined,
        startDate: val(`cert-startDate-${c.id}`) || undefined,
        endDate:   val(`cert-endDate-${c.id}`) || undefined,
      }));
      activeProfile.languages = splitCSV(val('langs-input'));
      await saveProfile(activeProfile);
      toast('Skills saved');
    })();
  });
}

// ── Documents handlers ─────────────────────────────────────────────────────
function attachDocumentsHandlers() {
  document.getElementById('cv-file')?.addEventListener('change', (e) => {
    void (async () => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const status = document.getElementById('cv-status');
      try {
        if (!/\.(pdf|doc|docx)$/i.test(file.name)) throw new Error('Choose a PDF, DOC, or DOCX file.');
        if (file.size > 10 * 1024 * 1024) throw new Error('File exceeds the 10 MB limit.');
        const buf = await file.arrayBuffer();
        const db = await openCvDb();
        await dbPut(db, file.name, buf);
        db.close();
        settings = await patchSettings({ cvFileName: file.name });
        toast('CV uploaded');
        render();
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : 'Could not save this document.';
        toast(error instanceof Error ? error.message : 'Could not save this document.', 'error');
      }
    })();
  });

  document.getElementById('remove-cv')?.addEventListener('click', () => {
    void (async () => {
      const db = await openCvDb();
      await dbDelete(db);
      db.close();
      settings = await patchSettings({ cvFileName: undefined });
      toast('CV removed');
      render();
    })();
  });
}

function openCvDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wayfill-cv', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db: IDBDatabase, name: string, buf: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(buf, 'cv');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    void name;
  });
}

function dbDelete(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete('cv');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Q&A handlers ───────────────────────────────────────────────────────────
function attachQAHandlers() {
  document.getElementById('add-qa')?.addEventListener('click', () => {
    activeProfile.qa.push({ id: crypto.randomUUID(), question: '', answer: '', variants: [], keywords: [] });
    render();
  });

  document.getElementById('save-qa-btn')?.addEventListener('click', () => {
    void (async () => {
      activeProfile.qa = activeProfile.qa.map(q => ({
        ...q,
        question: val(`qa-question-${q.id}`),
        answer: val(`qa-answer-${q.id}`),
        keywords: val(`qa-keywords-${q.id}`).split(',').map(k => k.trim()).filter(Boolean),
      }));
      await saveProfile(activeProfile);
      toast('Q&A bank saved');
    })();
  });

  attachDeleteHandlers('qa');
}

// ── Privacy handlers ───────────────────────────────────────────────────────
function attachPrivacyHandlers() {
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    if (!confirm('Delete ALL Wayfill data? This cannot be undone.')) return;
    void (async () => {
      await clearAllData();
      settings = AppSettingsSchema.parse({});
      activeProfile = createBlankProfile();
      toast('All data deleted');
      render();
    })();
  });
}

// ── Import/Export handlers ─────────────────────────────────────────────────
function attachImportExportHandlers() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    void (async () => {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'wayfill-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast('Exported successfully');
    })();
  });

  document.getElementById('import-file')?.addEventListener('change', (e) => {
    void (async () => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const status = document.getElementById('import-status');
      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;
        await importData(data);
        [settings, activeProfile] = await Promise.all([loadSettings(), getActiveProfile()]);
        toast('Import complete');
        if (status) status.textContent = `Imported from ${file.name}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not import this file.';
        if (status) status.textContent = message;
        toast(message, 'error');
      }
    })();
  });
}

// ── Delete entry helper ────────────────────────────────────────────────────
function attachDeleteHandlers(type: 'education' | 'experience' | 'qa') {
  document.querySelectorAll<HTMLButtonElement>(`.delete-entry[data-type="${type}"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset['id']!;
      if (type === 'education') activeProfile.education = activeProfile.education.filter(e => e.id !== id);
      if (type === 'experience') activeProfile.experience = activeProfile.experience.filter(e => e.id !== id);
      if (type === 'qa') activeProfile.qa = activeProfile.qa.filter(q => q.id !== id);
      render();
    });
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  [settings, activeProfile] = await Promise.all([loadSettings(), getActiveProfile()]);
  // init complete
  render();
}

void init();
