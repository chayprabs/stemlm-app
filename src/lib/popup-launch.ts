/**
 * Toolbar popup launch decisions. The popup UI calls these helpers — tests
 * exercise the same functions, not a reimplementation.
 */
import { browser } from 'wxt/browser';
import { extensionAssetUrl } from '@/src/lib/extension-context';
import {
  deliverStemLmMessage,
  getActiveTab,
  type DeliverableStemLmMessage,
  type StemLmDeliveryResult,
} from '@/src/lib/tab-bridge';
import { lastChatFromUrl, rememberLastChat } from '@/src/lib/last-chat';
import { adapterForUrl, supportedChatLabels } from '@/src/platforms/detect';
import { CHAT_HOST_LAUNCH, type ChatHostLaunch } from '@/src/platforms/hosts';
import type { PlatformId } from '@/src/platforms/types';
import {
  OPEN_STUDY_PANEL_LABEL,
  POPUP_WIDTH_PX,
  SAVED_QUESTIONS_LABEL,
  SETTINGS_LABEL,
  SETTINGS_WINDOW_HEIGHT_PX,
  SETTINGS_WINDOW_WIDTH_PX,
  STEMLM_TOGGLE_LABEL,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
} from '@/src/lib/saved-library';

export {
  CHAT_HOST_LAUNCH,
  OPEN_STUDY_PANEL_LABEL,
  POPUP_WIDTH_PX,
  SAVED_QUESTIONS_LABEL,
  SETTINGS_LABEL,
  SETTINGS_WINDOW_HEIGHT_PX,
  SETTINGS_WINDOW_WIDTH_PX,
  STEMLM_TOGGLE_LABEL,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
};
export type { ChatHostLaunch };

export function unsupportedHostNotice(labels: string[] = supportedChatLabels()): string {
  const names = labels.length > 0 ? labels.join(', ') : 'Gemini';
  return `Open a chat tab (${names}) to use the study panel.`;
}

/**
 * The compact guide as text for any chat box: the way to use stemLM by hand, in a chat it does
 * not run on. Written by the builder that writes it into a chat box, and loaded only when asked
 * for, so the popup opens without the guide's text.
 */
export async function guideForPasting(): Promise<string> {
  const { buildInjectionPrompt } = await import('@/src/protocol/builder');
  return buildInjectionPrompt('').prompt;
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
  if (code === 'stemlm-disabled') return 'Turn stemlm on in the toolbar popup, then try again.';
  if (code === 'content-chat-changed') return 'The chat changed. Open stemlm again in the chat you want to use.';
  if (code === 'content-script-startup-failed' || code === 'content-script-no-acknowledgement') {
    return 'Could not start stemlm. Keep a copy of your draft, then refresh the chat and try again.';
  }
  if (code === 'content-script-timeout' || code === 'content-script-starting') {
    return 'stemlm is not ready yet. Try again shortly. If it stays unavailable, keep a copy of your draft before refreshing the chat.';
  }
  return 'Could not start stemlm. Try refreshing the page.';
}

/** Open the study panel without loading the conversation. */
export async function openStudyPanel(): Promise<LaunchResult> {
  try {
    const result = await deliverStemLmMessage('stemlm:open-panel');
    if (result.ok !== true) throw new Error(result.error || 'content script rejected message');
    const tab = await getActiveTab();
    await rememberUrl(tab?.url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

async function openTab(url: string): Promise<LaunchResult> {
  try {
    await browser.tabs.create({ url, active: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

export async function openChatHost(id: PlatformId): Promise<LaunchResult> {
  const host = CHAT_HOST_LAUNCH.find((item) => item.id === id);
  if (!host) return { ok: false, error: 'Unknown chat host.' };
  return openTab(host.url);
}

const SETTINGS_PAGE = 'options.html';
const LIBRARY_PAGE = 'saved-library.html';
const WELCOME_PAGE = 'welcome.html';

function extensionPageUrl(page: string): string {
  return extensionAssetUrl(page.startsWith('/') ? page : `/${page}`);
}

function tabIsExtensionPage(tabUrl: string | undefined, page: string, url: string): boolean {
  if (!tabUrl) return false;
  const clean = tabUrl.split('?')[0] ?? tabUrl;
  return clean === url || clean.endsWith(`/${page}`);
}

async function focusExistingSheet(page: string, url: string): Promise<boolean> {
  try {
    const popups = await browser.windows.getAll({ populate: true, windowTypes: ['popup'] });
    const existing = popups.find((win) =>
      win.tabs?.some((tab) => tabIsExtensionPage(tab.url, page, url)),
    );
    if (existing?.id == null) return false;
    await browser.windows.update(existing.id, { focused: true });
    return true;
  } catch {
    return false;
  }
}

async function sheetAnchor(): Promise<{ left?: number; top?: number }> {
  try {
    const current = await browser.windows.getCurrent();
    const left =
      typeof current.left === 'number' && typeof current.width === 'number'
        ? Math.max(0, current.left + current.width - 24)
        : undefined;
    const top = typeof current.top === 'number' ? current.top + 72 : undefined;
    return { left, top };
  } catch {
    return {};
  }
}

async function openExtensionSheet(
  page: string,
  size: { width: number; height: number },
): Promise<LaunchResult> {
  const url = extensionPageUrl(page);
  if (await focusExistingSheet(page, url)) return { ok: true };
  const anchor = await sheetAnchor();
  try {
    await browser.windows.create({
      url,
      type: 'popup',
      width: size.width,
      height: size.height,
      focused: true,
      ...(typeof anchor.left === 'number' ? { left: Math.max(0, anchor.left - size.width) } : {}),
      ...(typeof anchor.top === 'number' ? { top: anchor.top } : {}),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

/** The first-run guide, as a normal tab (ONBOARD-01). */
export function openWelcomePage(): Promise<LaunchResult> {
  return openTab(extensionPageUrl(WELCOME_PAGE));
}

/**
 * Open saved questions in a sized popup window. The toolbar action popup
 * stays 312px — Chrome cannot shrink it after it grows.
 */
export async function openSavedQuestionsLibrary(): Promise<LaunchResult> {
  return openExtensionSheet(LIBRARY_PAGE, {
    width: LIBRARY_WINDOW_WIDTH_PX,
    height: LIBRARY_WINDOW_HEIGHT_PX,
  });
}

/**
 * Open settings in a sized popup window. Never reload the chat tab or grow
 * the toolbar popup.
 */
export async function openSettingsOverlay(): Promise<LaunchResult> {
  return openExtensionSheet(SETTINGS_PAGE, {
    width: SETTINGS_WINDOW_WIDTH_PX,
    height: SETTINGS_WINDOW_HEIGHT_PX,
  });
}

export type { DeliverableStemLmMessage, StemLmDeliveryResult };
