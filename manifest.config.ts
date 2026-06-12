import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'SideQuest',
  version: '0.1.0',
  description: 'Earn your distractions. Blocked sites cost a side quest.',
  icons: {
    16: 'sidequestLogo16.png',
    32: 'sidequestLogo32.png',
    48: 'sidequestLogo48.png',
    128: 'sidequestLogo128.png',
  },
  permissions: ['storage', 'tabs', 'alarms', 'webNavigation'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'SideQuest',
    default_icon: {
      16: 'sidequestLogo16.png',
      32: 'sidequestLogo32.png',
      48: 'sidequestLogo48.png',
      128: 'sidequestLogo128.png',
    },
  },
  options_page: 'src/options/index.html',
});
