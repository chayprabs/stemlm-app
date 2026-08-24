/**
 * Toolbar popup launch decisions. The popup UI calls these helpers — tests
 * exercise the same functions, not a reimplementation.
 */
import { browser } from 'wxt/browser';
import {
  deliverStemLmMessage,
  deliverStemLmMessageToTab,
  getActiveTab,
  isRestrictedTabUrl,
  type DeliverableStemLmMessage,
  type StemLmDeliveryResult,
} from '@/src/lib/tab-bridge';
import { lastChatFromUrl, rememberLastChat } from '@/src/lib/last-chat';
import { adapterForUrl, isSupportedChatUrl, supportedChatLabels } from '@/src/platforms/detect';
import { CHAT_HOST_LAUNCH, type ChatHostLaunch } from '@/src/platforms/hosts';
import type { PlatformId } from '@/src/platforms/types';
import {
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
  OPEN_STUDY_PANEL_LABEL,
  POPUP_WIDTH_PX,
  SAVED_QUESTIONS_LABEL,
} from '@/src/lib/saved-library';

export {
  CHAT_HOST_LAUNCH,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
  OPEN_STUDY_PANEL_LABEL,
  POPUP_WIDTH_PX,
  SAVED_QUESTIONS_LABEL,
};
export type { ChatHostLaunch };

export function unsupportedHostNotice(labels: string[] = supportedChatLabels()): string {
  const names = labels.length > 0 ? labels.join(', ') : 'Gemini';
  return `Open a ${names} tab to use the study panel.`;
}

export type LaunchResult =
  | { ok: true; loaded?: number }
  | { ok: false; empty: true }
  | { ok: false; error: string };

async function rememberUrl(url: string | undefined): Promise<void> {
  const adapter = adapterForUrl(url);
  if (!adapter || !url) return;
  const record = lastChatFromUrl(url, adapter.id);
  if (record) await rememberLastChat(record);
}

function launchErrorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'not-gemini' || code === 'not-supported') {
    return unsupportedHostNotice();
  }
  if (code === 'no-active-tab') return 'No active tab found.';
  if (code === 'no-tab') return 'Could not open a new tab.';
  return 'Could not start stemLM. Try refreshing the page.';
}

/** Open the study panel without loading the conversation. */
export async function openStudyPanel(): Promise<LaunchResult> {
  try {
    await deliverStemLmMessage('stemlm:open-panel');
    const tab = await getActiveTab();
    await rememberUrl(tab?.url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

export async function openChatHost(id: PlatformId): Promise<LaunchResult> {
  const host = CHAT_HOST_LAUNCH.find((item) => item.id === id);
  if (!host) return { ok: false, error: 'Unknown chat host.' };
  try {
    await browser.tabs.create({ url: host.url, active: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

export type SavedLibraryTarget = 'window' | 'tab' | 'fallback';

function libraryPageUrl(): string {
  const runtime = browser.runtime as typeof browser.runtime & { getURL: (path: string) => string };
  return runtime.getURL('/saved-library.html');
}

/**
 * Open the saved-questions library in a dedicated window (large enough for the
 * new chrome). Falls back to the chat overlay, then an in-popup overlay.
 */
export async function openSavedQuestionsLibrary(): Promise<SavedLibraryTarget> {
  const url = libraryPageUrl();
  try {
    await browser.windows.create({
      url,
      type: 'popup',
      width: LIBRARY_WINDOW_WIDTH_PX,
      height: LIBRARY_WINDOW_HEIGHT_PX,
      focused: true,
    });
    return 'window';
  } catch {
    /* windows.create unavailable — try a tab, then overlay */
  }

  try {
    await browser.tabs.create({ url, active: true });
    return 'tab';
  } catch {
    /* fall through */
  }

  const tab = await getActiveTab();
  if (!tab?.id || isRestrictedTabUrl(tab.url) || !isSupportedChatUrl(tab.url)) {
    return 'fallback';
  }
  try {
    await deliverStemLmMessageToTab(tab.id, 'stemlm:open-saved-library', { reloadIfMissing: false });
    return 'tab';
  } catch {
    return 'fallback';
  }
}

export type { DeliverableStemLmMessage, StemLmDeliveryResult };
