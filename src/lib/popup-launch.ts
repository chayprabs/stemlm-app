/**
 * Toolbar popup launch decisions. The popup UI calls these helpers — tests
 * exercise the same functions, not a reimplementation.
 */
import {
  deliverStemLmMessage,
  deliverStemLmMessageToTab,
  getActiveTab,
  isRestrictedTabUrl,
  type DeliverableStemLmMessage,
  type StemLmDeliveryResult,
} from '@/src/lib/tab-bridge';
import { getLastChat, lastChatFromUrl, rememberLastChat } from '@/src/lib/last-chat';
import { adapterForUrl, isSupportedChatUrl, supportedChatLabels } from '@/src/platforms/detect';
import { OPEN_ALL_SAVED_LABEL } from '@/src/lib/saved-library';
import { BACKGROUND_LAUNCH, enqueueBackgroundLaunch } from '@/src/lib/background-launch';

export { OPEN_ALL_SAVED_LABEL };

export type LaunchId = 'start-here' | 'start-new' | 'open-last' | 'ask-here';

export const LAUNCH_LABELS: Record<LaunchId, string> = {
  'start-here': 'Start here',
  'start-new': 'Start new',
  'open-last': 'Open last',
  'ask-here': 'Ask here',
};

export interface LaunchTile {
  id: LaunchId;
  label: string;
  disabled: boolean;
  visible: boolean;
  emphasis: 'primary' | 'default';
}

export function launchTiles(opts: { supported: boolean; hasLastChat: boolean }): LaunchTile[] {
  return [
    {
      id: 'start-here',
      label: LAUNCH_LABELS['start-here'],
      visible: opts.supported,
      disabled: false,
      emphasis: 'primary',
    },
    {
      id: 'start-new',
      label: LAUNCH_LABELS['start-new'],
      visible: true,
      disabled: false,
      emphasis: opts.supported ? 'default' : 'primary',
    },
    {
      id: 'open-last',
      label: LAUNCH_LABELS['open-last'],
      visible: true,
      disabled: !opts.hasLastChat,
      emphasis: 'default',
    },
    {
      id: 'ask-here',
      label: LAUNCH_LABELS['ask-here'],
      visible: opts.supported,
      disabled: false,
      emphasis: 'default',
    },
  ];
}

export function unsupportedHostNotice(labels: string[] = supportedChatLabels()): string {
  const names = labels.length > 0 ? labels.join(', ') : 'Gemini';
  return `This website is not supported. stemLM currently only works on ${names}.`;
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

async function rememberActiveTab(): Promise<void> {
  const tab = await getActiveTab();
  await rememberUrl(tab?.url);
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

async function startHere(): Promise<LaunchResult> {
  const res = await deliverStemLmMessage('stemlm:load-conversation');
  if ((res.loaded ?? 0) > 0) await rememberActiveTab();
  return { ok: true, loaded: res.loaded ?? 0 };
}

async function startNew(): Promise<LaunchResult> {
  await enqueueBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'start-new' });
  return { ok: true };
}

async function openLast(): Promise<LaunchResult> {
  const last = await getLastChat();
  if (!last) return { ok: false, empty: true };
  await enqueueBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'open-last', url: last.url });
  return { ok: true };
}

async function askHere(): Promise<LaunchResult> {
  const res = await deliverStemLmMessage('stemlm:ask-here');
  await rememberActiveTab();
  return { ok: true, loaded: res.loaded };
}

export async function runLaunchAction(id: LaunchId): Promise<LaunchResult> {
  try {
    if (id === 'start-here') return await startHere();
    if (id === 'start-new') return await startNew();
    if (id === 'open-last') return await openLast();
    return await askHere();
  } catch (err) {
    return { ok: false, error: launchErrorMessage(err) };
  }
}

export type SavedLibraryTarget = 'tab' | 'fallback';

/** Overlay on a Gemini tab when the content script can host it; otherwise in-popup. */
export async function openSavedQuestionsLibrary(): Promise<SavedLibraryTarget> {
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