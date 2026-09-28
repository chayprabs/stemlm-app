import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { trackEvent } from '@/src/lib/analytics';
import { applyToolbarIconInBackground, isToolbarIconMessage } from '@/src/lib/toolbar-icon';
import {
  isAuthorizedBackgroundSender,
  isBackgroundLaunchMessage,
  performBackgroundLaunch,
} from '@/src/lib/background-launch';
import { handleWhoamiRequest, isWhoamiMessage, removeTabWorkspace, takePendingPanelAction } from '@/src/lib/tab-workspace';
import { isSupportedChatUrl } from '@/src/platforms/detect';
import { handleSavedSessionMutation, isSavedSessionMutationMessage } from '@/src/lib/saved-session-storage';
import { isPdfExportMessage, openPdfExportWindow } from '@/src/lib/pdf-export-request';
import { extensionAssetUrl } from '@/src/lib/extension-context';
import { CHAT_CONTENT_MATCHES } from '@/src/platforms/hosts';

/**
 * UPDATE-01 (D13): MV3 never re-injects declared content scripts into tabs that were
 * already open, so after install or update the chat tabs would show no stemLM until
 * reloaded. WXT's started-event stops any orphaned older instance before mounting.
 */
async function injectIntoOpenChatTabs(): Promise<void> {
  try {
    const tabs = await browser.tabs.query({ url: [...CHAT_CONTENT_MATCHES] });
    await Promise.allSettled(tabs.filter((tab) => typeof tab.id === 'number' && !tab.discarded).map((tab) =>
      browser.scripting.executeScript({ target: { tabId: tab.id! }, files: ['content-scripts/content.js'] })));
  } catch {
    // No tabs API or the query failed: the next page load injects as usual.
  }
}

function isSavedSessionSender(sender: { id?: string; url?: string }): boolean {
  if (!browser.runtime.id || sender.id !== browser.runtime.id || !sender.url) return false;
  if (isSupportedChatUrl(sender.url)) return true;
  try {
    const actual = new URL(sender.url);
    const runtime = browser.runtime as typeof browser.runtime & { getURL: (path: string) => string };
    const extension = new URL(runtime.getURL('/'));
    return actual.protocol === extension.protocol && actual.host === extension.host;
  } catch {
    return false;
  }
}

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
  // Recovery runs in our isolated content scripts; Chrome otherwise denies session storage there.
  const workspaceReady = Promise.resolve(browser.storage?.session?.setAccessLevel?.({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })).catch(() => {});
  browser.tabs?.onRemoved?.addListener((tabId) => { void removeTabWorkspace(tabId); });
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') void injectIntoOpenChatTabs();
    if (details.reason === 'install') {
      void trackEvent('extension_installed', {});
      // First run: the bundled guide, once. Updates never open a tab (ONBOARD-01).
      void browser.tabs.create({ url: extensionAssetUrl('/welcome.html'), active: true }).catch(() => {});
    }
  });

  browser.runtime.onMessage.addListener((msg: unknown, sender, sendResponse) => {
    if ((msg as { type?: unknown } | null)?.type === 'stemlm:claim-panel-action') {
      if (!isSavedSessionSender(sender) || typeof sender.tab?.id !== 'number') {
        sendResponse({ action: null });
        return;
      }
      void takePendingPanelAction(sender.tab.id).then((action) => sendResponse({ action }), () => sendResponse({ action: null }));
      return true;
    }
    if (isSavedSessionMutationMessage(msg)) {
      if (!isSavedSessionSender(sender)) {
        sendResponse({ ok: false, quota: false, message: 'Unauthorized saved-session request.' });
        return;
      }
      void handleSavedSessionMutation(msg).then(sendResponse, () => {
        sendResponse({ ok: false, quota: false, message: 'Could not update saved sessions. Try again.' });
      });
      return true;
    }
    if (isPdfExportMessage(msg)) {
      if (!isSavedSessionSender(sender)) {
        sendResponse({ ok: false });
        return;
      }
      void openPdfExportWindow(msg.session, sender.tab?.windowId).then((ok) => sendResponse({ ok }), () => sendResponse({ ok: false }));
      return true;
    }
    if (isToolbarIconMessage(msg)) {
      if (!isSavedSessionSender(sender)) return;
      void applyToolbarIconInBackground(msg.theme);
      return;
    }
    if (isWhoamiMessage(msg)) {
      if (!isSavedSessionSender(sender)) {
        sendResponse({});
        return;
      }
      void workspaceReady.then(() => sendResponse(handleWhoamiRequest(sender)));
      return true;
    }
    if (isBackgroundLaunchMessage(msg)) {
      const runtimeId = (browser.runtime as typeof browser.runtime & { id?: string }).id;
      if (!isAuthorizedBackgroundSender(sender, runtimeId)) {
        sendResponse({ ok: false });
        return;
      }
      void performBackgroundLaunch(msg).then(
        (result) => sendResponse({ ok: result.ok !== false, ...result }),
        (err) => {
          void trackEvent('extension_error', {
            where: 'background',
            kind: 'launch',
            reason: String(err).slice(0, 120),
          });
          sendResponse({ ok: false });
        },
      );
      return true;
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
