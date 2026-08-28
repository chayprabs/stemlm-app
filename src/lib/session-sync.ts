/**
 * Cross-tab session sharing (opt-in via the "Share across tabs" setting).
 *
 * When enabled, the active sessions are mirrored to storage.session, which is
 * shared by all tabs in the browser session. Other tabs hydrate from and
 * subscribe to it, so the same study workspace follows the user. When disabled,
 * each tab keeps its own in-memory sessions (the default = fresh start per tab).
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';

const KEY = 'stemlm_active_sessions';

/** Strip bulky fields before cross-tab mirror (steps + raw text stay in-tab). */
export function sessionsForMirror(sessions: Session[]): Session[] {
  return sessions.map((s) => ({
    ...s,
    raw: '',
  }));
}

function mergeSessionPair(local: Session, incoming: Session): Session {
  if (incoming.updatedAt > local.updatedAt) {
    return incoming.raw.trim() ? incoming : { ...incoming, raw: local.raw };
  }
  if (local.updatedAt > incoming.updatedAt) {
    return local;
  }
  return local.raw.trim() ? local : { ...local, raw: incoming.raw };
}

/**
 * Merge by session id — keep the copy with the latest updatedAt.
 * Sorted oldest-first so the newest session sits last, matching the store's
 * append order and every `sessions[sessions.length - 1]` "latest" pick.
 */
export function mergeMirroredSessions(local: Session[], incoming: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const session of [...local, ...incoming]) {
    const existing = byId.get(session.id);
    if (!existing) {
      byId.set(session.id, session);
      continue;
    }
    byId.set(session.id, mergeSessionPair(existing, session));
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function sessionsMirrorFingerprint(sessions: Session[]): string {
  return sessions.map((s) => `${s.id}:${s.updatedAt}`).join('|');
}

export async function mirrorActiveSessions(sessions: Session[]): Promise<void> {
  try {
    await browser.storage.session.set({ [KEY]: sessionsForMirror(sessions) });
  } catch {
    /* session storage may be unavailable */
  }
}

export async function loadMirroredSessions(): Promise<Session[]> {
  try {
    const list = (await browser.storage.session.get(KEY))[KEY] as Session[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function onMirroredSessionsChanged(cb: (sessions: Session[]) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'session' && changes[KEY]) {
      const next = changes[KEY].newValue as Session[] | undefined;
      cb(Array.isArray(next) ? next : []);
    }
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
