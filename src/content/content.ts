/**
 * Wayfill – Content Script
 * Injected into every frame. Handles fill triggers and page interaction.
 * AI calls are always routed to the service worker via chrome.runtime.sendMessage.
 */

// ── Message listener ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const msg = message as { type: string };

  switch (msg.type) {
    case 'FILL_START':
      handleFillStart();
      sendResponse({ status: 'ok' });
      break;

    case 'ANALYZE_JOB':
      handleAnalyzeJob();
      sendResponse({ status: 'ok' });
      break;

    default:
      break;
  }

  return false;
});

// ── Handlers (stubs — implemented in later phases) ────────────────────────
function handleFillStart() {
  // Phase 4+: trigger the autofill pipeline
  console.warn('[Wayfill] fill triggered — implementation in Phase 4');
}

function handleAnalyzeJob() {
  // Phase 8: collect page text and send to background worker for AI analysis
  console.warn('[Wayfill] analyze triggered — implementation in Phase 8');
}
