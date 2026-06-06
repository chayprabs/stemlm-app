/**
 * Deliver popup / toolbar actions to the active Gemini tab.
 * Reloads the tab automatically when the content script is unreachable.
 */
import { browser } from 'wxt/browser';
import type { StemLmMessage } from '@/src/lib/messages';
import { setPendingPanelAction } from '@/src/lib/tab-workspace';

const GEMINI_HOST = /(^|\.)gemini\.google\.com$/i;

export function isGeminiUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return GEMINI_HOST.test(new URL(url).hostname);
  } catch {
    return false;
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

function waitForTabLoad(tabId: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      browser.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      ok ? resolve() : reject(new Error('tab load timeout'));
    };

    const onUpdated = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === 'complete') {
        setTimeout(() => finish(true), 450);
      }
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    browser.tabs.onUpdated.addListener(onUpdated);

    void browser.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        setTimeout(() => finish(true), 450);
      }
    });
  });
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

/** Send a stemLM action to the active Gemini tab, reloading once if needed. */
export type DeliverableStemLmMessage = Exclude<StemLmMessage['type'], 'stemlm:ping'>;

export async function deliverStemLmMessage(
  type: DeliverableStemLmMessage,
): Promise<StemLmDeliveryResult> {
  const tab = await getActiveTab();
  if (tab?.id == null) throw new Error('no-active-tab');
  if (!isGeminiUrl(tab.url)) throw new Error('not-gemini');

  try {
    return await sendStemLmMessage(tab.id, { type });
  } catch {
    /* content script not connected — reload and let it consume the pending action */
  }

  await setPendingPanelAction({ tabId: tab.id, type });
  await browser.tabs.reload(tab.id);
  await waitForTabLoad(tab.id);

  try {
    return await sendStemLmMessage(tab.id, { type });
  } catch {
    /* Pending action on content-script init handles open/load if this races. */
    return { ok: true };
  }
}
