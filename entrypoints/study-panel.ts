import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { PanelHost } from '@/src/components/PanelHost';

/**
 * Imported into a chat tab's content-script world the first time the panel
 * opens (PERF-03). Its shared imports resolve to the content script's own
 * modules (scripts/panel-split.ts); it hands back the panel root.
 */
export default defineUnlistedScript(() => {
  (globalThis as { __stemlmPanel?: typeof PanelHost }).__stemlmPanel = PanelHost;
});
