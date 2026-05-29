import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { trackEvent } from '@/src/lib/analytics';

/**
 * stemLM background service worker.
 *
 *  - Fire `extension_installed` on first install.
 *  - Log uncaught service-worker errors as `extension_error` (helps debugging
 *    once analytics credentials are configured).
 *  - When the toolbar icon is clicked, tell the active tab's content script to
 *    open the study panel.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void trackEvent('extension_installed', {});
    }
  });

  self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    void trackEvent('extension_error', {
      where: 'background',
      reason: String(event.reason).slice(0, 120),
    });
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'stemlm:open-panel' });
    } catch {
      // No content script on this tab (not a supported AI site) — ignore.
    }
  });
});
