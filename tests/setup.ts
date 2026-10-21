/**
 * Vitest global setup — mock Chrome extension APIs not available in jsdom
 */

// Simple in-memory store for chrome.storage.local
const _store: Record<string, unknown> = {};

const chromeMock = {
  runtime: {
    onMessage: { addListener: (_fn: unknown) => { void _fn; } },
    sendMessage: (_msg: unknown): Promise<unknown> => { void _msg; return Promise.resolve({}); },
    getManifest: () => ({ version: '0.1.0' }),
    openOptionsPage: (): Promise<void> => Promise.resolve(),
    onInstalled: { addListener: (_fn: unknown) => { void _fn; } },
  },
  storage: {
    local: {
      _data: _store,
      get: (keys: string | string[]): Promise<Record<string, unknown>> => {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        const result: Record<string, unknown> = {};
        for (const k of keyArr) {
          if (k in _store) result[k] = _store[k];
        }
        return Promise.resolve(result);
      },
      set: (items: Record<string, unknown>): Promise<void> => {
        Object.assign(_store, items);
        return Promise.resolve();
      },
      remove: (keys: string | string[]): Promise<void> => {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        for (const k of keyArr) delete _store[k];
        return Promise.resolve();
      },
      clear: (): Promise<void> => {
        for (const k of Object.keys(_store)) delete _store[k];
        return Promise.resolve();
      },
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

(globalThis as Record<string, unknown>)['chrome'] = chromeMock;
