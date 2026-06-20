import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'SideQuest',
  version: '0.1.0',
  description:
    'Block distracting sites on a schedule. To get back in, complete a side quest.',
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
      16: 'sidequestOffLogo16.png',
      32: 'sidequestOffLogo32.png',
      48: 'sidequestOffLogo48.png',
      128: 'sidequestOffLogo128.png',
    },
  },
  options_page: 'src/options/index.html',
});
