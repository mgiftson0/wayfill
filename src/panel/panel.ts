/**
 * AI Panel — injected as a side panel or popup window.
 * Handles: job analysis, fill trigger, and AI chat.
 */
import './panel.css';

interface AnalysisResult {
  role?: string;
  company?: string;
  keyRequirements?: string[];
  niceToHave?: string[];
  redFlags?: string[];
  matchTips?: string[];
}

// ── State ─────────────────────────────────────────────────────────────────
let activeTabId: number | undefined;
const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;

  attachHandlers();
  addMessage('ai', 'Ready to analyze this job posting. Click **Analyze** to get insights, or **Fill** to autofill the form.');
}

// ── Handlers ──────────────────────────────────────────────────────────────
function attachHandlers() {
  document.getElementById('btn-analyze')?.addEventListener('click', () => { void handleAnalyze(); });
  document.getElementById('btn-fill')?.addEventListener('click', () => { void handleFill(); });
  document.getElementById('btn-close')?.addEventListener('click', () => { window.close(); });

  const form = document.getElementById('chat-form') as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void handleChat();
  });

  // Auto-expand textarea
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
  });
  // Shift+Enter = newline, Enter = send
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleChat();
    }
  });
}

// ── Analyze job ────────────────────────────────────────────────────────────
async function handleAnalyze() {
  if (!activeTabId) return;
  const btn = document.getElementById('btn-analyze') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  try {
    // Get job text from content script
    const rawMsg: unknown = await chrome.tabs.sendMessage(activeTabId, { type: 'ANALYZE_JOB' });
    const { jobText } = rawMsg as { jobText: string };

    // Send to service worker → Anthropic
    const rawResult: unknown = await chrome.runtime.sendMessage({
      type: 'ANALYZE_JOB',
      payload: { jobText, tabId: activeTabId },
    });
    const result = rawResult as { ok: boolean; summary?: string; error?: string };

    if (!result.ok || !result.summary) {
      addMessage('error', result.error ?? 'Analysis failed. Check your API key in Settings → AI.');
      return;
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(result.summary) as AnalysisResult;
      renderAnalysis(parsed);
    } catch {
      // If not JSON, render as plain text
      addMessage('ai', result.summary);
    }
  } catch (err) {
    addMessage('error', String(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analyze';
  }
}

// ── Fill ───────────────────────────────────────────────────────────────────
async function handleFill() {
  if (!activeTabId) return;
  const btn = document.getElementById('btn-fill') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Filling…';

  try {
    await chrome.tabs.sendMessage(activeTabId, { type: 'FILL_START' });
  } catch (err) {
    addMessage('error', String(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fill';
  }
}

// ── Chat ───────────────────────────────────────────────────────────────────
async function handleChat() {
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const typingEl = addTyping();

  try {
    const rawChat: unknown = await chrome.runtime.sendMessage({
      type: 'ANALYZE_JOB',
      payload: {
        jobText: buildChatContext(text),
        tabId: activeTabId,
      },
    });
    const result = rawChat as { ok: boolean; summary?: string; error?: string };

    typingEl.remove();

    if (!result.ok || !result.summary) {
      addMessage('error', result.error ?? 'No response from AI.');
      return;
    }

    chatHistory.push({ role: 'assistant', content: result.summary });
    addMessage('ai', result.summary);
  } catch (err) {
    typingEl.remove();
    addMessage('error', String(err));
  }
}

function buildChatContext(userMsg: string): string {
  const history = chatHistory.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  return `You are a helpful job application assistant. Help the user with their application.

Previous conversation:
${history}

User: ${userMsg}

Respond concisely and helpfully.`;
}

// ── Render helpers ─────────────────────────────────────────────────────────
function addMessage(type: 'user' | 'ai' | 'error', text: string): HTMLElement {
  const container = document.getElementById('chat-messages')!;
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg-${type === 'error' ? 'error' : type === 'user' ? 'user' : 'ai'}`;
  // Simple markdown: **bold**
  el.innerHTML = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  container.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
  return el;
}

function addTyping(): HTMLElement {
  const container = document.getElementById('chat-messages')!;
  const el = document.createElement('div');
  el.className = 'chat-msg-typing';
  el.textContent = 'AI is thinking…';
  container.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
  return el;
}

function renderAnalysis(data: AnalysisResult) {
  const section = document.getElementById('analysis-section')!;
  const content = document.getElementById('analysis-content')!;
  section.classList.remove('hidden');

  const tags = (arr: string[] | undefined, cls = '') =>
    arr?.map((t) => `<span class="analysis-tag ${cls}">${t}</span>`).join('') ?? '';

  content.innerHTML = `
    <div class="analysis-role">${data.role ?? 'Role'}</div>
    <div class="analysis-company">${data.company ?? ''}</div>
    ${data.keyRequirements?.length ? `<div class="analysis-section-title">Key requirements</div>${tags(data.keyRequirements)}` : ''}
    ${data.niceToHave?.length ? `<div class="analysis-section-title">Nice to have</div>${tags(data.niceToHave)}` : ''}
    ${data.redFlags?.length ? `<div class="analysis-section-title">⚠ Red flags</div>${tags(data.redFlags, 'analysis-flag')}` : ''}
    ${data.matchTips?.length ? `<div class="analysis-section-title">Tips</div>${data.matchTips.map((t) => `<div class="analysis-tip">• ${t}</div>`).join('')}` : ''}
  `;

  section.scrollIntoView({ behavior: 'smooth' });
}

function renderFillSummary(filled: number, review: number, skipped: number) {
  const section = document.getElementById('fill-section')!;
  const el = document.getElementById('fill-summary')!;
  section.classList.remove('hidden');
  el.innerHTML = `
    <div class="fill-pills">
      <span class="pill pill-green">${filled} filled</span>
      <span class="pill pill-yellow">${review} needs review</span>
      <span class="pill pill-muted">${skipped} skipped</span>
    </div>
  `;
}

// Listen for fill complete
chrome.runtime.onMessage.addListener((msg) => {
  const m = msg as { type: string; payload?: { filled: number; review: number; skipped: number } };
  if (m.type === 'FILL_COMPLETE' && m.payload) {
    renderFillSummary(m.payload.filled, m.payload.review, m.payload.skipped);
  }
});

void init();
export { renderFillSummary };
