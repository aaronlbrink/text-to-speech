import { SERVER_BASE } from '@/config';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "Articles to Audio",
    permissions: ['downloads', 'activeTab', 'storage'],
    host_permissions: [`https://${SERVER_BASE}/*`],
    // "action" necessary to have clickable navbar button without a popup (mv2 requires page_action as fallback)
    action: {},
    // "page_action" required, see comment for "action"
    // page_action: {}
  }
});
