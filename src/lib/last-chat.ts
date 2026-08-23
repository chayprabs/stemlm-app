/**
 * Last stemLM chat — URL + platform in storage.local so it survives Chrome restarts.
 * Written when stemLM actually runs on a chat page, not when the popup merely opens.
 */
import { browser } from 'wxt/browser';
import {
  adapterById,
  adapterForUrl,
  type PlatformId,
} from '@/src/platforms/detect';

export const LAST_CHAT_KEY = 'stemlm_last_chat';

export interface LastChatRecord {
  url: string;
  platform: PlatformId;
  savedAt: number;
}

export function isLastChatRecord(value: unknown): value is LastChatRecord {
  if (!value || typeof value !== 'object') return false;
  const rec = value as LastChatRecord;
  if (typeof rec.url !== 'string' || !/^https?:\/\//i.test(rec.url)) return false;
  if (typeof rec.platform !== 'string' || !adapterById(rec.platform as PlatformId)) return false;
  if (typeof rec.savedAt !== 'number' || !Number.isFinite(rec.savedAt)) return false;
  return adapterForUrl(rec.url)?.id === rec.platform;
}

export function lastChatFromUrl(url: string, platform: PlatformId, savedAt = Date.now()): LastChatRecord | null {
  const record: LastChatRecord = { url, platform, savedAt };
  return isLastChatRecord(record) ? record : null;
}

export async function getLastChat(): Promise<LastChatRecord | null> {
  try {
    const stored = (await browser.storage.local.get(LAST_CHAT_KEY))[LAST_CHAT_KEY];
    return isLastChatRecord(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function rememberLastChat(record: LastChatRecord): Promise<void> {
  if (!isLastChatRecord(record)) return;
  try {
    await browser.storage.local.set({ [LAST_CHAT_KEY]: record });
  } catch {
    /* storage may be unavailable */
  }
}

/** Content-script helper: persist the current page as the last stemLM chat. */
export async function rememberCurrentChat(platform: PlatformId): Promise<void> {
  let href = '';
  try {
    href = globalThis.location?.href ?? '';
  } catch {
    return;
  }
  const record = lastChatFromUrl(href, platform);
  if (!record) return;
  await rememberLastChat(record);
}