import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'SideQuest',
  version: '0.1.0',
  description: 'Earn your distractions. Blocked sites cost a side quest.',
  permissions: ['storage', 'tabs', 'alarms', 'webNavigation'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'SideQuest',
  },
  options_page: 'src/options/index.html',
});
