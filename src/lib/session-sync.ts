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

export async function mirrorActiveSessions(sessions: Session[]): Promise<void> {
  try {
    await browser.storage.session.set({ [KEY]: sessions });
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
