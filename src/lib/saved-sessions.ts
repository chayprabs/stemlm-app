/**
 * Persistence for explicitly-saved study sessions (a small library the student
 * can revisit). Stored in storage.local so it survives tab/browser restarts and
 * is reachable from the popup. Active/unsaved sessions live only in the per-tab
 * content-script store.
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import { useStore } from '@/src/state/store';

export const SAVED_SESSIONS_KEY = 'stemlm_saved_sessions';
const MAX_SAVED = 100;

function normalizeSession(raw: Session): Session {
  return { ...raw, platform: 'gemini' };
}

function sortByRecent(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

async function readSavedSessions(): Promise<Session[]> {
  const list = (await browser.storage.local.get(SAVED_SESSIONS_KEY))[SAVED_SESSIONS_KEY] as
    | Session[]
    | undefined;
  return Array.isArray(list) ? sortByRecent(list.map(normalizeSession)) : [];
}

export async function getSavedSessions(): Promise<Session[]> {
  try {
    return await readSavedSessions();
  } catch {
    return [];
  }
}

export async function getSavedSession(id: string): Promise<Session | undefined> {
  return (await getSavedSessions()).find((s) => s.id === id);
}

export async function saveSession(session: Session): Promise<void> {
  const list = await readSavedSessions();
  const idx = list.findIndex((s) => s.id === session.id);
  const updated = normalizeSession({ ...session, updatedAt: Date.now() });
  const next = [...list];
  if (idx >= 0) next[idx] = updated;
  else next.unshift(updated);
  await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: sortByRecent(next).slice(0, MAX_SAVED) });
}

export async function deleteSavedSession(id: string): Promise<void> {
  const list = (await readSavedSessions()).filter((s) => s.id !== id);
  await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: list });
}

/** Load a saved library session into the active tab store and open the panel. */
export async function openSavedSession(id: string): Promise<boolean> {
  const session = await getSavedSession(id);
  if (!session) return false;
  const store = useStore.getState();
  store.setSessions([session]);
  store.setStatus('ready');
  store.openPanel();
  return true;
}

export async function isSessionSaved(id: string): Promise<boolean> {
  return (await getSavedSessions()).some((s) => s.id === id);
}
