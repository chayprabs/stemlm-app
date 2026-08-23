/**
 * Start new / Open last must survive the toolbar popup dying.
 * Chrome closes the action popup as soon as another tab becomes active, so
 * those launches arm a pending action, then hand the rest to the background SW.
 */
import { browser } from 'wxt/browser';
import {
  GEMINI_APP_URL,
  deliverStemLmMessageToTab,
  type StemLmDeliveryResult,
} from '@/src/lib/tab-bridge';
import { setPendingPanelAction, takePendingPanelAction } from '@/src/lib/tab-workspace';
import { rememberLastChat, lastChatFromUrl } from '@/src/lib/last-chat';
import { adapterForUrl } from '@/src/platforms/detect';

export const BACKGROUND_LAUNCH = 'stemlm:background-launch' as const;

export type BackgroundLaunchRequest =
  | { type: typeof BACKGROUND_LAUNCH; kind: 'start-new' }
  | { type: typeof BACKGROUND_LAUNCH; kind: 'open-last'; url: string };

export function isBackgroundLaunchMessage(msg: unknown): msg is BackgroundLaunchRequest {
  if (!msg || typeof msg !== 'object') return false;
  const rec = msg as { type?: unknown; kind?: unknown; url?: unknown };
  if (rec.type !== BACKGROUND_LAUNCH) return false;
  if (rec.kind === 'start-new') return true;
  return rec.kind === 'open-last' && typeof rec.url === 'string' && rec.url.length > 0;
}

function urlsMatchChat(a: string, b: string): boolean {
  const normalize = (value: string) => value.replace(/\/+$/, '');
  return normalize(a) === normalize(b);
}

async function openChatTabInactive(url: string): Promise<{ id: number; url?: string }> {
  try {
    const tabs = await browser.tabs.query({});
    const match = tabs.find((tab) => typeof tab.url === 'string' && urlsMatchChat(tab.url, url));
    if (match?.id != null) return { id: match.id, url: match.url };
  } catch {
    /* query failed — create instead */
  }
  const created = await browser.tabs.create({ url, active: false });
  if (created.id == null) throw new Error('no-tab');
  return { id: created.id, url: created.url ?? url };
}

async function activateTab(tabId: number): Promise<void> {
  try {
    await browser.tabs.update(tabId, { active: true });
  } catch {
    /* already gone */
  }
}

async function rememberIfSupported(url: string | undefined): Promise<void> {
  const adapter = adapterForUrl(url);
  if (!adapter || !url) return;
  const record = lastChatFromUrl(url, adapter.id);
  if (record) await rememberLastChat(record);
}

/**
 * Arm pending BEFORE focusing the tab. Focusing kills the action popup; the
 * content script then consumes pending on boot via sender.tab.id.
 */
export async function performBackgroundLaunch(
  req: BackgroundLaunchRequest,
): Promise<StemLmDeliveryResult> {
  if (req.kind === 'start-new') {
    const tab = await browser.tabs.create({ url: GEMINI_APP_URL, active: false });
    if (tab.id == null) throw new Error('no-tab');
    await setPendingPanelAction({ tabId: tab.id, type: 'stemlm:open-panel' });
    await activateTab(tab.id);
    return deliverArmed(tab.id, 'stemlm:open-panel');
  }

  const tab = await openChatTabInactive(req.url);
  await setPendingPanelAction({ tabId: tab.id, type: 'stemlm:load-conversation' });
  await activateTab(tab.id);
  const res = await deliverArmed(tab.id, 'stemlm:load-conversation');
  if ((res.loaded ?? 0) > 0) await rememberIfSupported(tab.url ?? req.url);
  return res;
}

async function deliverArmed(
  tabId: number,
  type: 'stemlm:open-panel' | 'stemlm:load-conversation',
): Promise<StemLmDeliveryResult> {
  try {
    const res = await deliverStemLmMessageToTab(tabId, type, { reloadIfMissing: false });
    if (res.ok !== false) {
      await takePendingPanelAction(tabId);
    }
    return res;
  } catch {
    return { ok: true };
  }
}

/** Popup: ACK from the SW if it is alive, otherwise run here (tests / no SW). */
export async function enqueueBackgroundLaunch(req: BackgroundLaunchRequest): Promise<void> {
  try {
    const res = (await browser.runtime.sendMessage(req)) as { ok?: boolean; queued?: boolean } | undefined;
    if (res?.ok === true && res.queued === true) return;
  } catch {
    /* no listener */
  }
  await performBackgroundLaunch(req);
}