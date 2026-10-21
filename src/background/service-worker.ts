/**
 * Wayfill – Background Service Worker
 * All Anthropic API calls are made here, never in content scripts.
 */

// ── Message handlers ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as { type: string; payload?: unknown };

  switch (msg.type) {
    case 'AI_ANALYZE':
      // Phase 8: handle AI analysis requests
      sendResponse({ status: 'not_implemented' });
      break;

    case 'PING':
      sendResponse({ status: 'ok', version: chrome.runtime.getManifest().version });
      break;

    default:
      break;
  }

  // Return true only if we intend to call sendResponse asynchronously
  return false;
});

// ── Install / update lifecycle ────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // First-run: open options page for profile setup
    void chrome.runtime.openOptionsPage();
  }
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === 'autofill') {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        void chrome.tabs.sendMessage(tab.id, { type: 'FILL_START' });
      }
    });
  }
});
