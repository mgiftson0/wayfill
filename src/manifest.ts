import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Wayfill',
  version: '0.1.0',
  description: 'AI-powered autofill for U.S. job applications',
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
    },
    default_title: 'Wayfill',
  },
  options_page: 'src/options/options.html',
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      all_frames: true,
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['<all_urls>', 'https://api.anthropic.com/*'],
  commands: {
    autofill: {
      suggested_key: {
        default: 'Alt+Shift+F',
        mac: 'Alt+Shift+F',
      },
      description: 'Trigger autofill on current page',
    },
  },
  web_accessible_resources: [
    {
      resources: ['src/panel/panel.html', 'icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});
