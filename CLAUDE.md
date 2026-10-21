# CLAUDE.md – Wayfill Developer Reference

> **Keep this file up to date** as the project evolves. Every phase should update the relevant sections.

---

## Project Structure

```
wayfill/
├── src/
│   ├── manifest.ts           # MV3 manifest (source of truth, typed)
│   ├── background/
│   │   └── service-worker.ts # Background service worker (all AI/API calls here)
│   ├── content/
│   │   └── content.ts        # Content script injected into every frame
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   └── panel/
│       ├── panel.html        # AI side panel (web_accessible_resource)
│       ├── panel.ts
│       └── panel.css
├── tests/                    # Vitest unit tests (jsdom)
│   ├── setup.ts              # Chrome API mocks
│   └── *.test.ts
├── e2e/                      # Playwright end-to-end tests
│   ├── fixtures/
│   │   ├── pages/            # Static ATS-style HTML pages served by `serve`
│   │   └── extension-fixture.ts
│   └── *.spec.ts
├── icons/                    # Extension icons (16,32,48,128 px PNG)
├── CLAUDE.md                 # This file
├── DECISIONS.md              # Architecture decisions log
├── README.md                 # User-facing install and usage guide
├── KNOWN_LIMITATIONS.md      # Phase 10
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json
├── .eslintrc.cjs
└── package.json
```

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR for the extension |
| `npm run build` | TypeScript check + Vite production build → `dist/` |
| `npm run test` | Vitest unit tests (one-shot, CI mode) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run e2e` | Playwright E2E tests (builds ext first, then runs) |
| `npm run lint` | ESLint with zero warnings allowed |
| `npm run typecheck` | `tsc --noEmit` only |

**Definition of Done (every phase):**  
`npm run typecheck && npm run lint && npm run test && npm run build` must all pass before committing.

---

## Code Conventions

- **TypeScript strict mode** — no `any` without explicit comment justification.
- **No default exports** except from `manifest.ts` and Vite config files.
- **File naming**: `kebab-case.ts` for modules, `PascalCase.ts` for classes/schemas.
- **Imports**: use `@/` alias for `src/` (configured in `vite.config.ts` and `tsconfig.json`).
- **Async**: always `void` floating promises at top level; never use `.then()` without `.catch()`.
- **Chrome APIs**: always `await`; handle exceptions with try/catch.
- **Content script**: never make network calls directly — route through `chrome.runtime.sendMessage` to the service worker.
- **Tests**: one `describe` per source file, `it` over `test`, clear arrange/act/assert structure.
- **CSS**: custom properties only (no inline styles except ephemeral JS transitions), BEM-ish class names.
- **Fonts**: Inter (300/400/500 weights only — no 600+).

---

## Privacy Rules (MANDATORY)

1. **No SSN, bank account, or password fields** are ever stored or transmitted.
2. **EEO self-ID** answers are never sent to the AI.
3. **AI calls** only happen when the user explicitly clicks "Analyze this job".
4. **What-will-be-sent preview** shown before the first AI call per site.
5. **Passphrase encryption** (AES-GCM via Web Crypto API) encrypts the Anthropic API key and optionally the entire profile when a passphrase is set.
6. **No analytics, no telemetry, no remote code** — the only outbound requests are user-initiated calls to `api.anthropic.com`.
7. **IndexedDB** for documents; `chrome.storage.local` for profile/settings.

---

## Phase Tracker

| # | Phase | Status |
|---|-------|--------|
| 1 | Scaffold, build pipeline, manifest, empty popup/options | ✅ Done |
| 2 | Storage layer, profile schema (zod), options UI | ⬜ |
| 3 | Matcher + synonym dictionary + unit tests | ⬜ |
| 4 | Filler for all input types, React-compatible events | ⬜ |
| 5 | Radio/checkbox/Yes-No, EEO, repeating sections | ⬜ |
| 6 | Document store and file attachment | ⬜ |
| 7 | Highlighting, summary, floating button, teach mode | ⬜ |
| 8 | AI assistant, service worker client, side panel | ⬜ |
| 9 | Playwright E2E full coverage | ⬜ |
| 10 | Hardening, README, KNOWN_LIMITATIONS.md | ⬜ |

---

## ATS Target Sites

| ATS | Notes |
|-----|-------|
| Workday | Shadow DOM heavy, iFrames |
| Greenhouse | Standard HTML, clear labels |
| Lever | React SPA |
| iCIMS | Legacy-style |
| Taleo | iframe-in-iframe |
| SmartRecruiters | React SPA |
| Ashby | React, good ARIA |
| Custom career pages | Flexible matcher needed |

---

## Extension Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Popup (popup.ts)                   │
│  Job type selector · Fill button · Analyze button       │
└─────────────────────────────┬───────────────────────────┘
                              │ chrome.tabs.sendMessage
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Content Script (content.ts)            │
│  MutationObserver · Field matcher · Filler              │
│  Collects page text for AI · Floating button            │
└────────────────────┬────────────────────────────────────┘
                     │ chrome.runtime.sendMessage (AI only)
                     ▼
┌─────────────────────────────────────────────────────────┐
│             Service Worker (service-worker.ts)          │
│  Anthropic API client · Response caching                │
└─────────────────────────────────────────────────────────┘
```
