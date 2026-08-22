import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { trackEvent } from '@/src/lib/analytics';
import { applyToolbarIconInBackground, isToolbarIconMessage } from '@/src/lib/toolbar-icon';

/**
 * stemLM background service worker.
 *
 *  - Fire `extension_installed` on first install.
 *  - Log uncaught service-worker errors as `extension_error` (helps debugging
 *    once analytics credentials are configured).
 *
 * Toolbar actions are handled by the default popup (see entrypoints/popup).
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void trackEvent('extension_installed', {});
    }
  });

  browser.runtime.onMessage.addListener((msg: unknown) => {
    if (!isToolbarIconMessage(msg)) return;
    void applyToolbarIconInBackground(msg.theme);
  });

  self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    void trackEvent('extension_error', {
      where: 'background',
      kind: 'unhandledrejection',
      reason: String(event.reason).slice(0, 120),
    });
  });

  self.addEventListener('error', (event: ErrorEvent) => {
    void trackEvent('extension_error', {
      where: 'background',
      kind: 'error',
      reason: String(event.message ?? event.error).slice(0, 120),
    });
  });
});
