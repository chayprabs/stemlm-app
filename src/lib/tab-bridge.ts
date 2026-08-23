/**
 * Deliver popup / toolbar actions to a chatbot tab.
 * Reloads the tab automatically when the content script is unreachable.
 */
import { browser } from 'wxt/browser';
import type { StemLmMessage } from '@/src/lib/messages';
import { adapterForUrl, isSupportedChatUrl } from '@/src/platforms/detect';
import {
  setPendingPanelAction,
  takePanelActionResult,
  type PanelActionResult,
  type PendingPanelAction,
} from '@/src/lib/tab-workspace';

export const GEMINI_APP_URL = 'https://gemini.google.com/app';

export function isGeminiUrl(url: string | undefined): boolean {
  return adapterForUrl(url)?.id === 'gemini';
}

export function isRestrictedTabUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === 'chrome:' ||
      parsed.protocol === 'edge:' ||
      parsed.protocol === 'about:' ||
      parsed.protocol === 'devtools:' ||
      parsed.protocol === 'chrome-extension:'
    ) {
      return true;
    }
    if (parsed.hostname === 'chromewebstore.google.com') return true;
    if (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function getActiveTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

/** Open Gemini in the current tab, or a new tab if the current one cannot be used. */
export async function openGeminiTab(): Promise<void> {
  const tab = await getActiveTab();
  if (tab?.id != null) {
    try {
      await browser.tabs.update(tab.id, { url: GEMINI_APP_URL });
      return;
    } catch {
      /* restricted chrome:// pages etc. */
    }
  }
  await browser.tabs.create({ url: GEMINI_APP_URL });
}

/** Always a new Gemini tab. Default inactive so the action popup is not destroyed mid-launch. */
export async function createGeminiTab(opt?: { active?: boolean }): Promise<{ id: number; url?: string }> {
  const tab = await browser.tabs.create({ url: GEMINI_APP_URL, active: opt?.active ?? false });
  if (tab.id == null) throw new Error('no-tab');
  return { id: tab.id, url: tab.url ?? GEMINI_APP_URL };
}

function urlsMatchChat(a: string, b: string): boolean {
  const normalize = (value: string) => value.replace(/\/+$/, '');
  return normalize(a) === normalize(b);
}

export async function focusOrCreateTab(url: string): Promise<{ id: number; url?: string }> {
  try {
    const tabs = await browser.tabs.query({});
    const match = tabs.find((tab) => typeof tab.url === 'string' && urlsMatchChat(tab.url, url));
    if (match?.id != null) {
      await browser.tabs.update(match.id, { active: true });
      if (match.windowId != null) {
        try {
          await browser.windows.update(match.windowId, { focused: true });
        } catch {
          /* windows API may be unavailable */
        }
      }
      return { id: match.id, url: match.url };
    }
  } catch {
    /* query failed — create instead */
  }
  const created = await browser.tabs.create({ url, active: true });
  if (created.id == null) throw new Error('no-tab');
  return { id: created.id, url: created.url ?? url };
}

function isNoReceiverError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /receiving end does not exist|could not establish connection/i.test(msg);
}

export interface StemLmDeliveryResult {
  ok?: boolean;
  loaded?: number;
}

async function sendStemLmMessage(
  tabId: number,
  message: StemLmMessage,
): Promise<StemLmDeliveryResult> {
  const res = await browser.tabs.sendMessage(tabId, message);
  if (res && typeof res === 'object' && (res as { ok?: boolean }).ok === false) {
    throw new Error('content script rejected message');
  }
  return (res as StemLmDeliveryResult) ?? { ok: true };
}

async function waitForContentScript(tabId: number, timeoutMs = 15000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await sendStemLmMessage(tabId, { type: 'stemlm:ping' });
      if (res.ok !== false) return true;
    } catch (err) {
      if (!isNoReceiverError(err)) throw err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function waitForPanelActionResult(
  tabId: number,
  timeoutMs = 15000,
): Promise<PanelActionResult | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await takePanelActionResult(tabId);
    if (result) return result;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export type DeliverableStemLmMessage = Exclude<StemLmMessage['type'], 'stemlm:ping'>;

function asPendingType(type: DeliverableStemLmMessage): PendingPanelAction['type'] | null {
  if (type === 'stemlm:open-panel' || type === 'stemlm:load-conversation' || type === 'stemlm:ask-here') {
    return type;
  }
  return null;
}

/**
 * Send a stemLM action to a specific tab. If the content script is missing,
 * stash a pending action and optionally reload, then wait for the result.
 */
export async function deliverStemLmMessageToTab(
  tabId: number,
  type: DeliverableStemLmMessage,
  opt?: { reloadIfMissing?: boolean },
): Promise<StemLmDeliveryResult> {
  try {
    return await sendStemLmMessage(tabId, { type });
  } catch (err) {
    if (!isNoReceiverError(err)) throw err;
  }

  const pendingType = asPendingType(type);
  if (pendingType) {
    await setPendingPanelAction({ tabId, type: pendingType });
  }

  if (opt?.reloadIfMissing !== false) {
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.status === 'complete') {
        await browser.tabs.reload(tabId);
      }
    } catch {
      await browser.tabs.reload(tabId);
    }
  }

  const ready = await waitForContentScript(tabId, 25000);
  if (!ready) throw new Error('content-script-timeout');

  const resultTimeoutMs = type === 'stemlm:load-conversation' ? 20_000 : 10_000;
  const pendingResult = await waitForPanelActionResult(tabId, resultTimeoutMs);
  if (pendingResult) return pendingResult;

  try {
    return await sendStemLmMessage(tabId, { type });
  } catch (err) {
    if (!isNoReceiverError(err)) throw err;
    return { ok: false };
  }
}

/** Send a stemLM action to the active supported chatbot tab, reloading once if needed. */
export async function deliverStemLmMessage(
  type: DeliverableStemLmMessage,
): Promise<StemLmDeliveryResult> {
  const tab = await getActiveTab();
  if (tab?.id == null) throw new Error('no-active-tab');
  if (!isSupportedChatUrl(tab.url)) throw new Error('not-gemini');

  return deliverStemLmMessageToTab(tab.id, type, { reloadIfMissing: true });
}

export { isSupportedChatUrl, adapterForUrl };