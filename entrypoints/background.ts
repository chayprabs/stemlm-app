import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';

/**
 * stemLM background service worker.
 *
 * Responsibilities:
 *  - Fire the `extension_installed` analytics event on first install.
 *  - When the toolbar icon is clicked, tell the active tab's content script to
 *    open the study panel (in "load conversation" mode if there is no active
 *    session yet).
 *
 * Real logic is wired in later milestones; this scaffolds the message surface.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      // Analytics wiring (M6): track installs.
      const { trackEvent } = await import('@/src/lib/analytics');
      void trackEvent('extension_installed', {});
    }
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
