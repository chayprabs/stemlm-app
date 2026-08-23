import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { trackEvent } from '@/src/lib/analytics';
import { applyToolbarIconInBackground, isToolbarIconMessage } from '@/src/lib/toolbar-icon';
import {
  isBackgroundLaunchMessage,
  performBackgroundLaunch,
} from '@/src/lib/background-launch';
import { handleWhoamiRequest, isWhoamiMessage } from '@/src/lib/tab-workspace';

/**
 * stemLM background service worker.
 *
 *  - Fire `extension_installed` on first install.
 *  - Log uncaught service-worker errors as `extension_error` (helps debugging
 *    once analytics credentials are configured).
 *  - Resolve content-script tab ids (sender.tab.id) — chrome.tabs.getCurrent
 *    is unavailable in content scripts.
 *  - Finish Start new / Open last after the action popup is destroyed.
 *
 * Toolbar actions are handled by the default popup (see entrypoints/popup).
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void trackEvent('extension_installed', {});
    }
  });

  browser.runtime.onMessage.addListener((msg: unknown, sender, sendResponse) => {
    if (isToolbarIconMessage(msg)) {
      void applyToolbarIconInBackground(msg.theme);
      return;
    }
    if (isWhoamiMessage(msg)) {
      sendResponse(handleWhoamiRequest(sender));
      return;
    }
    if (isBackgroundLaunchMessage(msg)) {
      sendResponse({ ok: true, queued: true });
      void performBackgroundLaunch(msg).catch((err) => {
        void trackEvent('extension_error', {
          where: 'background',
          kind: 'launch',
          reason: String(err).slice(0, 120),
        });
      });
      return;
    }
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
