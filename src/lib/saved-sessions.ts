/**
 * Persistence for explicitly-saved study sessions (a small library the student
 * can revisit). Stored in storage.local so it survives tab/browser restarts and
 * is reachable from the popup. Active/unsaved sessions live only in the per-tab
 * content-script store.
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';

const KEY = 'stemlm_saved_sessions';
const MAX_SAVED = 100;

export async function getSavedSessions(): Promise<Session[]> {
  try {
    const list = (await browser.storage.local.get(KEY))[KEY] as Session[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveSession(session: Session): Promise<void> {
  const list = await getSavedSessions();
  const idx = list.findIndex((s) => s.id === session.id);
  const updated = { ...session, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  await browser.storage.local.set({ [KEY]: list.slice(0, MAX_SAVED) });
}

export async function deleteSavedSession(id: string): Promise<void> {
  const list = (await getSavedSessions()).filter((s) => s.id !== id);
  await browser.storage.local.set({ [KEY]: list });
}

export async function isSessionSaved(id: string): Promise<boolean> {
  return (await getSavedSessions()).some((s) => s.id === id);
}
