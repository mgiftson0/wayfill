# DECISIONS.md – Wayfill Architecture Decisions Log

> Decisions are recorded here to prevent revisiting settled questions and to document trade-offs for future contributors.

---

## Phase 1 — Scaffold

### D-001: Build tool – Vite + @crxjs/vite-plugin

**Date:** 2026-10-21  
**Decision:** Use Vite 5 as the bundler with `@crxjs/vite-plugin@2.0.0-beta.23` for Manifest V3 extension builds.  
**Rationale:** crxjs handles the complex MV3 service-worker bundling, HMRC for popup/options during dev, and auto-generates the final `manifest.json` from the typed `src/manifest.ts`. Alternatives (webpack + chrome-extension-tools, Parcel) require significantly more config and have less community momentum for MV3.  
**Trade-off:** crxjs beta status means occasional API churn; pinned to beta.23 for stability.

### D-002: Testing – Vitest + jsdom (unit) + Playwright (E2E)

**Date:** 2026-10-21  
**Decision:** Vitest with jsdom for unit tests; Playwright with a persistent Chromium context loading the built extension for E2E.  
**Rationale:** Vitest is natively integrated with Vite (same config transform pipeline). Playwright's persistent context with `--load-extension` is the standard way to drive real Chrome extensions with full API access.  
**Trade-off:** E2E tests require a real (non-headless) Chromium when extensions are loaded; we pass `headless: false`.

### D-003: No React/Vue – vanilla TypeScript DOM

**Date:** 2026-10-21  
**Decision:** Build popup, options, and panel with vanilla TypeScript + manual DOM manipulation, not React or Vue.  
**Rationale:** Extension popups are small, short-lived UIs; adding React adds ~50 KB to the bundle and complicates the extension's CSP. Vanilla TS gives full control over CSP compliance and bundle size. The filler itself needs deep DOM knowledge anyway, so the team is already in DOM-land.  
**Trade-off:** More boilerplate for complex options page UI; acceptable given the scope.

### D-004: Chrome storage layout

**Date:** 2026-10-21  
**Decision:** Use `chrome.storage.local` for profile data and settings; IndexedDB (via a thin wrapper) for binary documents.  
**Rationale:** `chrome.storage.local` supports up to ~10 MB by default and is accessible from both service worker and content scripts without extra messaging. IndexedDB is required for binary blobs (resume PDFs, etc.) because `chrome.storage.local` does not efficiently handle large binary data.  
**Trade-off:** Two storage backends to maintain; mitigated by a unified storage abstraction in Phase 2.

### D-005: Font – Inter (weights 300/400/500)

**Date:** 2026-10-21  
**Decision:** Use Inter loaded from Google Fonts; restrict to 300 (light), 400 (regular), 500 (medium) weights. No bold (600+).  
**Rationale:** User requirement: "modern UI, stylish font family, no bold fonts." Inter is the leading choice for clean, technical UIs. Restricting weights keeps the font payload small and enforces the design constraint.

### D-006: Color palette – white, charcoal, gray

**Date:** 2026-10-21  
**Decision:** Primary palette: `#111111` bg, `#1a1a1a` surface, `#2e2e2e` border, `#f0f0f0` text, `#888888` muted, `#e0e0e0` accent. Semantic: green `#4caf82`, yellow `#d4a84b`, red `#c0544a`.  
**Rationale:** User requirement: "colors should be white, charcoal black, gray." Semantic colors are muted/desaturated variants to stay on-palette while providing clear status feedback for fill states.

### D-007: AI API calls in service worker only

**Date:** 2026-10-21  
**Decision:** All Anthropic API HTTP requests are made exclusively from the background service worker, never from content scripts.  
**Rationale:** MV3 CSP restricts content scripts from making cross-origin requests. Centralizing in the service worker also gives a single point for rate limiting, caching, and key management. Content scripts collect page text and send it via `chrome.runtime.sendMessage`; the worker handles the actual fetch and returns the result.

### D-008: ESLint zero-warnings policy

**Date:** 2026-10-21  
**Decision:** `npm run lint` uses `--max-warnings 0`. Any lint warning is a build failure.  
**Rationale:** Warnings accumulate into ignored noise. Treating them as errors keeps the codebase clean and makes `no-console` enforcement meaningful.

### D-009: Manual favicon/icon placeholder

**Date:** 2026-10-21  
**Decision:** Icon PNG files (16/32/48/128 px) are created as placeholders in Phase 1 and replaced with designed assets in Phase 10.  
**Rationale:** The build system requires icon references to exist; placeholder 1×1 pixel PNGs unblock the build. Real icons are a Phase 10 concern.
