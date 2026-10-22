/**
 * Background service worker — MV3.
 * Responsibilities:
 *  1. Keyboard shortcut relay (Alt+Shift+F → FILL_START)
 *  2. Anthropic API proxy (ANALYZE_JOB → Claude → response)
 *  3. Store fill summaries in settings
 *  4. Forward FILL_COMPLETE → update badge + store summary
 */
import { patchSettings, loadSettings } from '../storage/storage';
import type { AppSettings } from '../storage/settings-schema';
import { decrypt } from '../storage/crypto';

chrome.runtime.onInstalled.addListener(() => {
  console.warn('[wayfill] extension installed / updated');
});

// ── Keyboard shortcut ──────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'autofill') return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'FILL_START' });
  })();
});

// ── Message router ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const message = msg as { type: string; payload?: unknown };

  if (message.type === 'FILL_COMPLETE') {
    const p = message.payload as { filled: number; review: number; skipped: number; url: string; ts: number };
    void patchSettings({
      lastSummary: { filled: p.filled, review: p.review, skipped: p.skipped, url: p.url, ts: p.ts },
    });

    // Update badge
    const count = p.filled + p.review;
    void chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    void chrome.action.setBadgeBackgroundColor({ color: p.review > 0 ? '#d4a84b' : '#4caf82' });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'ANALYZE_JOB') {
    const { jobText, tabId } = message.payload as { jobText: string; tabId?: number };
    void analyzeJob(jobText, tabId ?? sender.tab?.id).then((result) => {
      sendResponse(result);
    });
    return true; // async
  }

  if (message.type === 'GET_SETTINGS') {
    void loadSettings().then((s) => sendResponse(s));
    return true;
  }

  if (message.type === 'TEST_API_KEY') {
    void testApiKey().then((result) => sendResponse(result));
    return true;
  }
});

// ── Anthropic API call ─────────────────────────────────────────────────────
async function getApiKey(): Promise<string | null> {
  const settings = await loadSettings();
  if (!settings.anthropicKey) return null;
  if (settings.encryptionEnabled && settings.kdfSalt) {
    // We can't decrypt without the session passphrase in the service worker.
    // The options page must send the decrypted key directly for now (Phase 8).
    return null;
  }
  return settings.anthropicKey;
}

async function analyzeJob(
  jobText: string,
  _tabId: number | undefined,
): Promise<{ ok: boolean; summary?: string; error?: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) return { ok: false, error: 'No API key configured. Add it in Settings → AI.' };

  const settings = await loadSettings();
  const model = settings.anthropicModel;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: buildJobAnalysisPrompt(jobText),
        }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, error: `Anthropic API error ${resp.status}: ${errText.slice(0, 200)}` };
    }

    const data = await resp.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content.find((b) => b.type === 'text')?.text ?? '';
    return { ok: true, summary: text };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function buildJobAnalysisPrompt(jobText: string): string {
  return `You are an AI assistant helping a job applicant understand a job posting.

Analyze this job posting and return a concise JSON object with these fields:
- "role": job title
- "company": company name
- "keyRequirements": top 5 required skills/experiences as array of strings
- "niceToHave": optional skills as array of strings
- "redFlags": any concerning patterns (unrealistic expectations, etc.) as array
- "matchTips": 2-3 personalized tips for the applicant to highlight in their application

Job posting text:
---
${jobText.slice(0, 4000)}
---

Respond with ONLY the JSON object, no markdown fences.`;
}

async function testApiKey(): Promise<{ ok: boolean; model?: string; error?: string }> {
  const apiKey = await getApiKey();
  if (!apiKey) return { ok: false, error: 'No API key stored' };
  try {
    const resp = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Keep the decrypt import used (will be used when passphrase forwarding is implemented)
void decrypt;

// ── Cleanup badge on tab close ─────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((_tabId) => {
  void chrome.action.setBadgeText({ text: '' });
});

export type { AppSettings };
