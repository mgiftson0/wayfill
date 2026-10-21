/**
 * Vitest global setup — mock Chrome extension APIs not available in jsdom
 */

// Minimal chrome runtime stub
const chromeMock = {
  runtime: {
    onMessage: { addListener: (_fn: unknown) => { void _fn; } },
    sendMessage: (_msg: unknown): Promise<unknown> => Promise.resolve({}),
    getManifest: () => ({ version: '0.1.0' }),
    openOptionsPage: (): Promise<void> => Promise.resolve(),
    onInstalled: { addListener: (_fn: unknown) => { void _fn; } },
  },
  storage: {
    local: {
      get: (_keys: string | string[]): Promise<Record<string, unknown>> => {
        void _keys;
        return Promise.resolve({});
      },
      set: (_items: Record<string, unknown>): Promise<void> => {
        void _items;
        return Promise.resolve();
      },
      remove: (_keys: string | string[]): Promise<void> => {
        void _keys;
        return Promise.resolve();
      },
      clear: (): Promise<void> => Promise.resolve(),
    },
  },
  tabs: {
    query: (_opts: unknown): Promise<chrome.tabs.Tab[]> => {
      void _opts;
      return Promise.resolve([]);
    },
    sendMessage: (_tabId: number, _msg: unknown): Promise<unknown> => {
      void _tabId; void _msg;
      return Promise.resolve({});
    },
  },
  commands: {
    onCommand: { addListener: (_fn: unknown) => { void _fn; } },
  },
};

// Assign to globalThis so TypeScript and tests can use it
(globalThis as Record<string, unknown>)['chrome'] = chromeMock;
