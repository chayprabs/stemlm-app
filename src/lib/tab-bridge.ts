/**
 * Deliver popup / toolbar actions to the active Gemini tab.
 * Reloads the tab automatically when the content script is unreachable.
 */
import { browser } from 'wxt/browser';
import type { StemLmMessage } from '@/src/lib/messages';
import {
  setPendingPanelAction,
  takePanelActionResult,
  type PanelActionResult,
} from '@/src/lib/tab-workspace';

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
  } catch (err) {
    if (!isNoReceiverError(err)) throw err;
  }

  await setPendingPanelAction({ tabId: tab.id, type });
  await browser.tabs.reload(tab.id);

  const ready = await waitForContentScript(tab.id, 25000);
  if (!ready) throw new Error('content-script-timeout');

  const resultTimeoutMs = type === 'stemlm:load-conversation' ? 20_000 : 10_000;
  const pendingResult = await waitForPanelActionResult(tab.id, resultTimeoutMs);
  if (pendingResult) return pendingResult;

  try {
    return await sendStemLmMessage(tab.id, { type });
  } catch (err) {
    if (!isNoReceiverError(err)) throw err;
    return { ok: false };
  }
}
